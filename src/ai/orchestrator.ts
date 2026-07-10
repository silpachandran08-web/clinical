import Anthropic from "@anthropic-ai/sdk";
import type { Clinic } from "@prisma/client";
import { env } from "../config/env";
import { prisma } from "../db/client";
import { buildSystemPrompt } from "./systemPrompt";
import { runTool, toolDefinitions } from "./tools";

const anthropic = new Anthropic({ apiKey: env.anthropicApiKey });

const MAX_TOOL_ROUNDS = 6;
const HISTORY_MESSAGES = 20; // recent turns kept as context

/**
 * Handles one inbound WhatsApp message end-to-end: loads/creates the
 * conversation, runs the Claude tool-use loop against the booking tools,
 * persists the exchange, and returns the text to send back to the patient.
 */
export async function handleInboundMessage(params: {
  clinic: Clinic;
  patientPhone: string;
  body: string;
}): Promise<string> {
  const existingId = await findConversationId(params.clinic.id, params.patientPhone);
  const conversation = existingId
    ? await prisma.conversation.update({ where: { id: existingId }, data: { lastMessageAt: new Date() } })
    : await prisma.conversation.create({
        data: { clinicId: params.clinic.id, patientPhone: params.patientPhone },
      });

  await prisma.message.create({
    data: { conversationId: conversation.id, direction: "INBOUND", body: params.body },
  });

  // Brand new conversation: ask which language to continue in before anything
  // else, rather than silently guessing from the first message.
  if (!existingId) {
    const question =
      "Hi! Would you like to continue in English or Arabic?\nمرحبًا! هل تفضل المتابعة بالإنجليزية أم العربية؟";
    await prisma.message.create({
      data: { conversationId: conversation.id, direction: "OUTBOUND", body: question },
    });
    return question;
  }

  const state = (conversation.state as { locale?: "AR" | "EN" } | null) ?? {};

  // Existing conversation that hasn't picked a language yet: this message IS
  // the patient's answer to that question, not a real booking request yet.
  if (!state.locale) {
    const locale = detectLocaleFromReply(params.body);
    await prisma.conversation.update({ where: { id: conversation.id }, data: { state: { locale } } });
    const confirmation =
      locale === "AR"
        ? "تمام، سأتابع معك بالعربية. كيف يمكنني مساعدتك اليوم؟"
        : "Great, I'll continue in English. How can I help you today?";
    await prisma.message.create({
      data: { conversationId: conversation.id, direction: "OUTBOUND", body: confirmation },
    });
    return confirmation;
  }

  // The most RECENT window, not the oldest: `asc` + take would return the
  // first 20 messages ever, so once a conversation grew past the window the
  // just-received patient message wasn't even included and the history ended
  // on an assistant turn — which the API rejects outright (400 "must end
  // with a user message"), silently killing replies on long conversations.
  const priorMessages = (
    await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "desc" },
      take: HISTORY_MESSAGES,
    })
  ).reverse();

  const messages: Anthropic.MessageParam[] = priorMessages.map((m) => ({
    role: m.direction === "INBOUND" ? "user" : "assistant",
    content: m.body,
  }));

  // The window can also start mid-conversation on an assistant turn; the API
  // requires the first message to be from the user, so trim leading replies.
  while (messages.length > 0 && messages[0].role === "assistant") {
    messages.shift();
  }

  // Prompt caching: mark cache breakpoints on the stable prefix (tools, then
  // the system prompt, then the conversation history up to and including the
  // just-received patient message). Everything before a breakpoint is cached
  // for ~5 minutes and re-read at ~10% of the normal input-token price — so
  // rounds 2+ of the tool loop below, and each subsequent message in an
  // active chat, stop re-paying for the same prefix. The system prompt is
  // hour-granular (see buildSystemPrompt) specifically so it stays stable.
  const lastMessage = messages[messages.length - 1];
  if (lastMessage && typeof lastMessage.content === "string") {
    lastMessage.content = [
      { type: "text", text: lastMessage.content, cache_control: { type: "ephemeral" } },
    ];
  }

  const tools: Anthropic.Tool[] = toolDefinitions.map((t, i) =>
    i === toolDefinitions.length - 1 ? { ...t, cache_control: { type: "ephemeral" } } : t,
  );

  const system: Anthropic.TextBlockParam[] = [
    {
      type: "text",
      text: buildSystemPrompt(params.clinic, state.locale),
      cache_control: { type: "ephemeral" },
    },
  ];

  let finalText = "";

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await anthropic.messages.create({
      model: env.claudeModel,
      max_tokens: 1024,
      system,
      tools,
      messages,
    });

    // Cost visibility in production logs: cache_read tokens are ~10x cheaper
    // than plain input tokens, so this line is how we know caching is working.
    const u = response.usage;
    console.log(
      `[ai-usage] model=${env.claudeModel} round=${round} in=${u.input_tokens} out=${u.output_tokens} cache_write=${u.cache_creation_input_tokens ?? 0} cache_read=${u.cache_read_input_tokens ?? 0}`,
    );

    const toolUses = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );

    if (toolUses.length === 0) {
      finalText = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      break;
    }

    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const toolUse of toolUses) {
      try {
        const result = await runTool(toolUse.name, toolUse.input, {
          clinic: params.clinic,
          patientPhone: params.patientPhone,
        });
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        });
      } catch (err) {
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          is_error: true,
          content: err instanceof Error ? err.message : "Tool call failed",
        });
      }
    }
    messages.push({ role: "user", content: toolResults });
  }

  if (!finalText) {
    // This fallback promises staff follow-up, so make that promise real the
    // same way the escalate_to_human tool does — otherwise nobody would ever
    // see that this conversation dead-ended.
    await prisma.staffEscalation.create({
      data: {
        clinicId: params.clinic.id,
        patientPhone: params.patientPhone,
        reason: "AI conversation could not complete — needs staff follow-up",
      },
    });
    finalText =
      state.locale === "AR"
        ? "عذرًا، سأحوّل طلبك إلى أحد موظفي العيادة وسيتواصلون معك هنا قريبًا."
        : "Sorry, I've passed this to our clinic staff — they'll get back to you here shortly.";
  }

  await prisma.message.create({
    data: { conversationId: conversation.id, direction: "OUTBOUND", body: finalText },
  });

  return finalText;
}

async function findConversationId(clinicId: string, patientPhone: string): Promise<string | null> {
  const existing = await prisma.conversation.findFirst({
    where: { clinicId, patientPhone },
    orderBy: { lastMessageAt: "desc" },
  });
  return existing?.id ?? null;
}

/** Arabic script anywhere in the reply, or the word "Arabic" spelled in Latin script, both mean AR; everything else defaults to EN. */
export function detectLocaleFromReply(text: string): "AR" | "EN" {
  if (/[؀-ۿ]/.test(text)) return "AR";
  if (text.toLowerCase().includes("arab")) return "AR";
  return "EN";
}
