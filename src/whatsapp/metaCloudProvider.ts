import crypto from "node:crypto";
import { env } from "../config/env.js";
import type { InboundWhatsAppMessage, WhatsAppProvider } from "./provider.js";

/**
 * Direct Meta WhatsApp Cloud API adapter — used if a clinic prefers to skip
 * the BSP layer, or as a documented reference implementation since Meta's
 * webhook/send format is public and stable (developers.facebook.com/docs/whatsapp).
 */
export class MetaCloudProvider implements WhatsAppProvider {
  async sendMessage(toPhone: string, body: string): Promise<void> {
    const url = `https://graph.facebook.com/v20.0/${env.meta.phoneNumberId}/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.meta.accessToken}`,
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

  verifyWebhookRequest(headers: Record<string, string | undefined>, rawBody: string): boolean {
    // Meta signs the payload with the App Secret (Meta App dashboard > Settings > Basic),
    // NOT the page access token used to send messages — different secret, different purpose.
    if (!env.meta.appSecret) return true; // dev mode, not configured yet
    const signature = headers["x-hub-signature-256"];
    if (!signature) return false;
    const expected =
      "sha256=" + crypto.createHmac("sha256", env.meta.appSecret).update(rawBody).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  }
}

// Meta's fields are usually digit-only already, but strip any stray
// spaces/dashes defensively so this always matches the clinic.whatsappNumber
// stored in the DB (which must also be entered as clean E.164, e.g. +15551234567).
function normalizePhone(raw: string): string {
  return `+${raw.replace(/[^\d]/g, "")}`;
}
