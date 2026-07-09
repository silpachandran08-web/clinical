import crypto from "node:crypto";
import type { InboundWhatsAppMessage, WhatsAppProvider } from "./provider";

export interface MetaCredentials {
  phoneNumberId: string;
  accessToken: string;
  appSecret: string;
}

/**
 * Direct Meta WhatsApp Cloud API adapter — used if a clinic prefers to skip
 * the BSP layer, or as a documented reference implementation since Meta's
 * webhook/send format is public and stable (developers.facebook.com/docs/whatsapp).
 *
 * Credentials are per-clinic (each clinic can run its own WhatsApp Business
 * number/app), passed in rather than read from global env.
 */
export class MetaCloudProvider implements WhatsAppProvider {
  constructor(private creds: MetaCredentials) {}

  async sendMessage(toPhone: string, body: string): Promise<void> {
    const url = `https://graph.facebook.com/v20.0/${this.creds.phoneNumberId}/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.creds.accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toPhone.replace("+", ""),
        type: "text",
        text: { body },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Meta Cloud API send failed (${res.status}): ${text}`);
    }
  }

  parseWebhookPayload(rawBody: unknown): InboundWhatsAppMessage[] {
    return parseMetaWebhookPayload(rawBody);
  }

  verifyWebhookRequest(headers: Record<string, string | undefined>, rawBody: string): boolean {
    // Meta signs the payload with the App Secret (Meta App dashboard > Settings > Basic),
    // NOT the access token used to send messages — different secret, different purpose.
    if (!this.creds.appSecret) return true; // dev mode, not configured yet
    const signature = headers["x-hub-signature-256"];
    if (!signature) return false;
    const expected =
      "sha256=" + crypto.createHmac("sha256", this.creds.appSecret).update(rawBody).digest("hex");
    const signatureBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expected);
    if (signatureBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(signatureBuf, expectedBuf);
  }
}

/**
 * Standalone so webhookHandler can figure out *which clinic* a webhook is
 * for before it knows which clinic's credentials to verify the signature
 * with — Meta's webhook JSON shape is fixed and needs no credentials to parse.
 */
export function parseMetaWebhookPayload(rawBody: unknown): InboundWhatsAppMessage[] {
  const payload = rawBody as {
    entry?: Array<{
      changes?: Array<{
        value?: {
          metadata?: { display_phone_number?: string };
          messages?: Array<{ from: string; id: string; timestamp: string; text?: { body: string } }>;
        };
      }>;
    }>;
  };

  const messages: InboundWhatsAppMessage[] = [];
  for (const entry of payload?.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const to = normalizePhone(change.value?.metadata?.display_phone_number ?? "");
      for (const m of change.value?.messages ?? []) {
        messages.push({
          fromPhone: normalizePhone(m.from),
          toPhone: to,
          body: m.text?.body ?? "",
          providerMessageId: m.id,
          timestamp: new Date(Number(m.timestamp) * 1000),
        });
      }
    }
  }
  return messages;
}

// Meta's fields are usually digit-only already, but strip any stray
// spaces/dashes defensively so this always matches the clinic.whatsappNumber
// stored in the DB (which must also be entered as clean E.164, e.g. +15551234567).
function normalizePhone(raw: string): string {
  return `+${raw.replace(/[^\d]/g, "")}`;
}
