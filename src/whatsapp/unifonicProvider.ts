import crypto from "node:crypto";
import { env } from "../config/env.js";
import type { InboundWhatsAppMessage, WhatsAppProvider } from "./provider.js";

/**
 * Unifonic WhatsApp Business API adapter.
 *
 * Unifonic (KSA-based Meta Business Partner) fronts the WhatsApp Cloud API
 * with its own REST layer + webhook management service, auth'd via an
 * AppSid/token pair, per https://docs.unifonic.com (WhatsApp APIs section).
 *
 * The exact request/response field names below (`SenderID`, `Recipient`,
 * `Body`) follow Unifonic's general messaging API conventions but MUST be
 * confirmed against the live docs/Postman collection issued when the WABA
 * is provisioned — Unifonic gates full endpoint specifics behind an active
 * account. Everything provider-specific is isolated to this one file by
 * design, so correcting field names later never touches the orchestrator
 * or booking logic.
 */
export class UnifonicProvider implements WhatsAppProvider {
  async sendMessage(toPhone: string, body: string): Promise<void> {
    const res = await fetch(`${env.unifonic.apiBase}/v1/whatsapp/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.unifonic.appSid}`,
      },
      body: JSON.stringify({
        SenderID: env.unifonic.senderId,
        Recipient: toPhone,
        Body: body,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Unifonic send failed (${res.status}): ${text}`);
    }
  }

  parseWebhookPayload(rawBody: unknown): InboundWhatsAppMessage[] {
    const payload = rawBody as {
      messages?: Array<{
        from: string;
        to: string;
        text?: string;
        id: string;
        timestamp?: string;
      }>;
    };

    if (!payload?.messages) return [];

    return payload.messages.map((m) => ({
      fromPhone: normalizePhone(m.from),
      toPhone: normalizePhone(m.to),
      body: m.text ?? "",
      providerMessageId: m.id,
      timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
    }));
  }

  verifyWebhookRequest(headers: Record<string, string | undefined>, rawBody: string): boolean {
    if (!env.unifonic.webhookSecret) return true; // dev mode, no secret configured yet
    const signature = headers["x-unifonic-signature"];
    if (!signature) return false;
    const expected = crypto
      .createHmac("sha256", env.unifonic.webhookSecret)
      .update(rawBody)
      .digest("hex");
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  }
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  return digits.startsWith("966") ? `+${digits}` : raw.startsWith("+") ? raw : `+${digits}`;
}
