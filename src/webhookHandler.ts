import { env } from "./config/env";
import { prisma } from "./db/client";
import { handleInboundMessage } from "./ai/orchestrator";
import { createWhatsAppProvider } from "./whatsapp/index";

const provider = createWhatsAppProvider();

/**
 * Framework-agnostic webhook logic, shared by the local Fastify server
 * (src/routes/webhook.ts) and the Vercel serverless entry point
 * (api/webhook.ts) so the two deployment targets can never drift apart.
 */
export function handleWebhookVerification(query: Record<string, unknown>): {
  status: number;
  body: string;
} {
  const challenge = query["hub.challenge"];
  const token = query["hub.verify_token"];
  if (token === env.meta.verifyToken && typeof challenge === "string") {
    return { status: 200, body: challenge };
  }
  return { status: 403, body: "verification failed" };
}

export async function handleWebhookMessage(params: {
  rawBody: string;
  headers: Record<string, string | undefined>;
  parsedBody: unknown;
}): Promise<{ status: number; body: object }> {
  if (!provider.verifyWebhookRequest(params.headers, params.rawBody)) {
    return { status: 401, body: { error: "invalid signature" } };
  }

  const inboundMessages = provider.parseWebhookPayload(params.parsedBody);

  // Processed synchronously, not "ack then keep working in the background":
  // a serverless invocation can be frozen the instant the response is sent,
  // so fire-and-forget work after replying is silently dropped there. This
  // is slower per-request but correct on both Fastify and Vercel.
  for (const message of inboundMessages) {
    if (!message.body) continue;

    const clinic = await prisma.clinic.findUnique({ where: { whatsappNumber: message.toPhone } });
    if (!clinic) {
      console.warn(`No clinic configured for WhatsApp number ${message.toPhone}`);
      continue;
    }

    try {
      const replyText = await handleInboundMessage({
        clinic,
        patientPhone: message.fromPhone,
        body: message.body,
      });
      await provider.sendMessage(message.fromPhone, replyText);
    } catch (err) {
      console.error("Failed to handle inbound WhatsApp message", err);
    }
  }

  return { status: 200, body: { ok: true } };
}
