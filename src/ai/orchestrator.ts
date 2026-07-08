import Anthropic from "@anthropic-ai/sdk";
import type { Clinic } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../db/client.js";
import { buildSystemPrompt } from "./systemPrompt.js";
import { runTool, toolDefinitions } from "./tools.js";

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

  const priorMessages = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
    take: HISTORY_MESSAGES,
  });

  const messages: Anthropic.MessageParam[] = priorMessages.map((m) => ({
    role: m.direction === "INBOUND" ? "user" : "assistant",
    content: m.body,
  }));

  const system = buildSystemPrompt(params.clinic);
  let finalText = "";

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await anthropic.messages.create({
      model: env.claudeModel,
      max_tokens: 1024,
      system,
      tools: toolDefinitions,
      messages,
    });

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
    finalText =
      params.clinic.defaultLocale === "AR"
        ? "عذرًا، سأحتاج لتحويلك إلى أحد موظفي العيادة للمتابعة."
        : "Sorry, let me connect you with clinic staff to help further.";
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
