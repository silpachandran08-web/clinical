import Anthropic from "@anthropic-ai/sdk";
import type { Clinic } from "@prisma/client";
import { env } from "../config/env";
import { prisma } from "../db/client";
import { createWhatsAppProvider } from "../whatsapp/index";
import { listDepartments } from "../adminHandlers";
import { buildSystemPrompt } from "./systemPrompt";
import { checkInboundRateLimit, rateLimitReplyText } from "./rateLimiter";
import { runTool, toolDefinitions } from "./tools";

const anthropic = new Anthropic({ apiKey: env.anthropicApiKey });

const MAX_TOOL_ROUNDS = 6;
const HISTORY_MESSAGES = 20; // recent turns kept as context
// A patient who's been quiet this long gets treated as starting a fresh
// conversation on their next message — no assumed continuity with whatever
// was said before the gap (see historyResetAt below).
const STALE_CONVERSATION_MS = 5 * 24 * 60 * 60 * 1000;

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
  const existing = await findConversation(params.clinic.id, params.patientPhone);
  // Computed from the OLD lastMessageAt, before the update below overwrites it.
  const isStale = existing ? Date.now() - existing.lastMessageAt.getTime() > STALE_CONVERSATION_MS : false;
  // Captured BEFORE the inbound message is persisted below, so the "gte"
  // history filter in runAssistantTurn is guaranteed to still include this
  // turn's own message — using a timestamp captured after that insert would
  // exclude it and leave Claude with zero messages (400 from the API).
  const turnStartedAt = new Date();
  const conversation = existing
    ? await prisma.conversation.update({ where: { id: existing.id }, data: { lastMessageAt: new Date() } })
    : await prisma.conversation.create({
        data: { clinicId: params.clinic.id, patientPhone: params.patientPhone },
      });

  await prisma.message.create({
    data: { conversationId: conversation.id, direction: "INBOUND", body: params.body },
  });

  // Brand new conversation: ask which language to continue in before anything
  // else, rather than silently guessing from the first message.
  if (!existing) {
    const question =
      "Hi! Would you like to continue in English or Arabic?\nهلا! تبي نكمل بالعربي ولا الإنجليزي؟";
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
        ? "تمام، نكمل بالعربي. وش تحتاج اليوم؟"
        : "Great, I'll continue in English. How can I help you today?";
    await prisma.message.create({
      data: { conversationId: conversation.id, direction: "OUTBOUND", body: confirmation },
    });
    return confirmation;
  }

  // Check if patient is asking to switch languages mid-conversation
  const requestedLocale = detectLanguageSwitchRequest(params.body);
  if (requestedLocale && requestedLocale !== state.locale) {
    await prisma.conversation.update({ where: { id: conversation.id }, data: { state: { locale: requestedLocale } } });
    const switchConfirmation =
      requestedLocale === "AR"
        ? "تمام، بنكمل بالعربي من الآن. وش تحتاج؟"
        : "Got it, I'll continue in English from now on. How can I help?";
    await prisma.message.create({
      data: { conversationId: conversation.id, direction: "OUTBOUND", body: switchConfirmation },
    });
    return switchConfirmation;
  }

  // Everything past this point calls Claude and costs money — deterministic,
  // free checks run first so abusive traffic never reaches the API at all.
  const rateLimit = await checkInboundRateLimit(params.clinic.id, params.patientPhone, params.body);
  if (!rateLimit.allowed) {
    if (rateLimit.reason !== "too_long") {
      await createEscalationIfNoneOpen(
        params.clinic.id,
        params.patientPhone,
        `Sent an unusually high number of messages (${rateLimit.reason} limit) — check for abuse or a patient who needs a phone call instead.`,
      );
    }
    const reply = rateLimitReplyText(rateLimit.reason, state.locale);
    await prisma.message.create({
      data: { conversationId: conversation.id, direction: "OUTBOUND", body: reply },
    });
    return reply;
  }

  const finalText = await runAssistantTurn({
    clinic: params.clinic,
    patientPhone: params.patientPhone,
    conversationId: conversation.id,
    locale: state.locale,
    historyResetAt: isStale ? turnStartedAt : undefined,
  });

  await prisma.message.create({
    data: { conversationId: conversation.id, direction: "OUTBOUND", body: finalText },
  });

  return finalText;
}

/**
 * Lets a receptionist hand a stuck conversation back to the AI instead of
 * taking it over manually: staff type an instruction ("book her the
 * earliest slot with Dr. Fathima tomorrow"), and the AI re-runs against the
 * SAME conversation history — ending on the patient's last message, same as
 * a normal turn — with that instruction as a one-off directive, then sends
 * the result to the patient itself (there's no inbound webhook request here
 * to piggyback a reply on, so this owns the WhatsApp send end-to-end).
 */
export async function handleStaffInstruction(params: {
  clinic: Clinic;
  patientPhone: string;
  instruction: string;
}): Promise<string> {
  const existing = await findConversation(params.clinic.id, params.patientPhone);
  if (!existing) {
    throw new Error("No conversation found for this patient — nothing for the AI to continue");
  }
  const conversationId = existing.id;
  const conversation = await prisma.conversation.findUniqueOrThrow({ where: { id: conversationId } });
  const state = (conversation.state as { locale?: "AR" | "EN" } | null) ?? {};
  const locale = state.locale ?? "EN";

  const finalText = await runAssistantTurn({
    clinic: params.clinic,
    patientPhone: params.patientPhone,
    conversationId,
    locale,
    staffInstruction: params.instruction,
  });

  await prisma.message.create({
    data: { conversationId, direction: "OUTBOUND", body: finalText },
  });
  await prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } });

  const provider = createWhatsAppProvider(params.clinic);
  await provider.sendMessage(params.patientPhone, finalText);

  return finalText;
}

/** The Claude tool-use loop shared by a normal inbound reply and a staff-instructed one — same history, same tools, same cost controls. */
async function runAssistantTurn(params: {
  clinic: Clinic;
  patientPhone: string;
  conversationId: string;
  locale: "AR" | "EN";
  staffInstruction?: string;
  // Set when the patient has been quiet past STALE_CONVERSATION_MS: only
  // messages from this point on are loaded, so Claude starts this turn with
  // no assumed continuity from the stale chat (nothing is deleted — older
  // messages just aren't fed into context for this turn).
  historyResetAt?: Date;
}): Promise<string> {
  // The most RECENT window, not the oldest: `asc` + take would return the
  // first 20 messages ever, so once a conversation grew past the window the
  // just-received patient message wasn't even included and the history ended
  // on an assistant turn — which the API rejects outright (400 "must end
  // with a user message"), silently killing replies on long conversations.
  const priorMessages = (
    await prisma.message.findMany({
      where: {
        conversationId: params.conversationId,
        ...(params.historyResetAt ? { createdAt: { gte: params.historyResetAt } } : {}),
      },
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

  // A staff instruction doesn't add a new inbound patient message, so the
  // window can end on our own prior reply. Without a trailing user turn,
  // Claude treats the last assistant message as a prefill and just continues
  // it (often producing nothing new at all) instead of composing a fresh
  // reply — so give it an explicit turn to act on the staff instruction.
  if (params.staffInstruction && (messages.length === 0 || messages[messages.length - 1].role !== "user")) {
    messages.push({
      role: "user",
      content: "(No new message from the patient — staff has left an instruction for you below. Reply to them now accordingly.)",
    });
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

  // The staff directive is deliberately its own, uncached system block: it's
  // one-off and small, so appending it after the cached prompt block doesn't
  // disturb that block's cache hits on ordinary turns (where this is absent).
  const departments = await listDepartments(params.clinic.id);
  const system: Anthropic.TextBlockParam[] = [
    {
      type: "text",
      text: buildSystemPrompt(params.clinic, params.locale, departments.map((d) => d.name)),
      cache_control: { type: "ephemeral" },
    },
  ];
  if (params.staffInstruction) {
    system.push({
      type: "text",
      text: `Clinic staff have reviewed this conversation and left this instruction for your next reply: "${params.staffInstruction}". Treat it as a real decision staff have already made, not a suggestion to second-guess, and it OVERRIDES whatever department/doctor the patient originally asked about or what you previously told them. If it names a specific doctor or department (e.g. "book general physician"), call check_availability/book_slot using THAT exact department or doctor — not the one from the patient's original message — since staff have already decided this is the right option. Do not just repeat back your own earlier "I couldn't find anything" from before the instruction arrived; that was about a different department and no longer applies. Reply with a specific, warm, reassuring next step (the doctor and a real time from the tool result, or an offer to book right now) rather than a vague "staff will follow up" — the patient should come away feeling helped, especially if this is urgent. Only fall back to a generic "staff will be in touch shortly" reply if the tools genuinely can't support what staff described. Respond to the patient's last message accordingly, and don't mention that staff sent an instruction — just help the patient.`,
    });
  }

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
    await createEscalationIfNoneOpen(
      params.clinic.id,
      params.patientPhone,
      "AI conversation could not complete — needs staff follow-up",
    );
    finalText =
      params.locale === "AR"
        ? "آسف، بحوّل طلبك لأحد موظفين العيادة وبيردون عليك هني قريب."
        : "Sorry, I've passed this to our clinic staff — they'll get back to you here shortly.";
  }

  return finalText;
}

/** Avoids piling up duplicate escalations for the same patient while one is still OPEN (e.g. repeated rate-limit trips, or hitting the tool-round limit more than once before staff respond). */
async function createEscalationIfNoneOpen(clinicId: string, patientPhone: string, reason: string): Promise<void> {
  const existing = await prisma.staffEscalation.findFirst({
    where: { clinicId, patientPhone, status: "OPEN" },
  });
  if (existing) return;
  await prisma.staffEscalation.create({ data: { clinicId, patientPhone, reason } });
}

async function findConversation(
  clinicId: string,
  patientPhone: string,
): Promise<{ id: string; lastMessageAt: Date } | null> {
  return prisma.conversation.findFirst({
    where: { clinicId, patientPhone },
    orderBy: { lastMessageAt: "desc" },
    select: { id: true, lastMessageAt: true },
  });
}

/** Arabic script anywhere in the reply, or the word "Arabic" spelled in Latin script, both mean AR; everything else defaults to EN. */
export function detectLocaleFromReply(text: string): "AR" | "EN" {
  if (/[؀-ۿ]/.test(text)) return "AR";
  if (text.toLowerCase().includes("arab")) return "AR";
  return "EN";
}

/** Detect if user is requesting to switch languages mid-conversation. */
function detectLanguageSwitchRequest(text: string): "AR" | "EN" | null {
  const lower = text.toLowerCase();
  // English switch requests
  if (
    lower.includes("english") ||
    lower.includes("switch to english") ||
    lower.includes("reply in english") ||
    lower.includes("use english") ||
    lower.includes("english only")
  ) {
    return "EN";
  }
  // Arabic switch requests (in English)
  if (
    lower.includes("arabic") ||
    lower.includes("switch to arabic") ||
    lower.includes("reply in arabic") ||
    lower.includes("use arabic") ||
    lower.includes("arabic only") ||
    lower.includes("reply in ar")
  ) {
    return "AR";
  }
  // Arabic switch requests (in Arabic) — "بالعربي" (in Arabic), "عربي" (Arabic), "غير لـ العربية" (switch to Arabic)
  if (/بالعربي|عربي فقط|نكمل بالعربي|استخدم العربية|رد بالعربي/.test(text)) {
    return "AR";
  }
  // English switch in Arabic — "بالإنجليزية" (in English), "إنجليزي" (English)
  if (/بالإنجليزية|إنجليزي فقط|نكمل بالإنجليزي|استخدم الإنجليزية|رد بالإنجليزي/.test(text)) {
    return "EN";
  }
  return null;
}
