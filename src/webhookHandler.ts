import { prisma } from "./db/client";
import { handleInboundMessage } from "./ai/orchestrator";
import { createWhatsAppProvider } from "./whatsapp/index";
import { parseMetaWebhookPayload } from "./whatsapp/metaCloudProvider";

/**
 * Framework-agnostic webhook logic, shared by the local Fastify server
 * (src/routes/webhook.ts) and the Vercel serverless entry point
 * (api/webhook.ts) so the two deployment targets can never drift apart.
 */
export async function handleWebhookVerification(query: Record<string, unknown>): Promise<{
  status: number;
  body: string;
}> {
  const challenge = query["hub.challenge"];
  const token = query["hub.verify_token"];
  if (typeof challenge !== "string" || typeof token !== "string") {
    return { status: 403, body: "verification failed" };
  }
  // Each clinic can run its own Meta App, so there's no single global
  // verify token to compare against — whichever clinic owns this token
  // is the one being verified.
  const clinic = await prisma.clinic.findFirst({ where: { whatsappVerifyToken: token } });
  if (!clinic) {
    return { status: 403, body: "verification failed" };
  }
  return { status: 200, body: challenge };
}

export async function handleWebhookMessage(params: {
  rawBody: string;
  headers: Record<string, string | undefined>;
  parsedBody: unknown;
}): Promise<{ status: number; body: object }> {
  // Meta's webhook JSON shape is fixed and needs no credentials to parse —
  // we have to know which clinic this is for before we know which clinic's
  // secret to verify the signature with.
  const inboundMessages = parseMetaWebhookPayload(params.parsedBody);

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

    const provider = createWhatsAppProvider(clinic);
    if (!provider.verifyWebhookRequest(params.headers, params.rawBody)) {
      console.warn(`Invalid webhook signature for clinic ${clinic.id}`);
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
