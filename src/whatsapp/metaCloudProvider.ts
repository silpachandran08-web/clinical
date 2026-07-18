import crypto from "node:crypto";
import type { InboundWhatsAppMessage, WhatsAppProvider, WhatsAppButton, WhatsAppListItem } from "./provider";

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

  async sendButtonMessage(toPhone: string, body: string, buttons: WhatsAppButton[]): Promise<void> {
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
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: body },
          action: {
            buttons: buttons.map((btn) => ({
              type: "reply",
              reply: {
                id: btn.id,
                title: btn.title.substring(0, 20), // Meta limit
              },
            })),
          },
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Meta Cloud API button send failed (${res.status}): ${text}`);
    }
  }

  async sendListMessage(
    toPhone: string,
    body: string,
    listItems: WhatsAppListItem[],
    buttonLabel: string = "Select"
  ): Promise<void> {
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
        type: "interactive",
        interactive: {
          type: "list",
          body: { text: body },
          action: {
            button: buttonLabel.substring(0, 20),
            sections: [
              {
                rows: listItems.map((item) => ({
                  id: item.id,
                  title: item.title.substring(0, 24), // Meta limit
                  description: item.description?.substring(0, 72), // Meta limit
                })),
              },
            ],
          },
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Meta Cloud API list send failed (${res.status}): ${text}`);
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
          messages?: Array<{
            from: string;
            id: string;
            timestamp: string;
            type?: string;
            text?: { body: string };
            button?: { payload: string }; // button click
            audio?: { id: string; mime_type?: string; voice?: boolean }; // voice note / audio message
            interactive?: {
              type: string;
              button_reply?: { id: string; title: string };
              list_reply?: { id: string; title: string };
            };
          }>;
        };
      }>;
    }>;
  };

  const messages: InboundWhatsAppMessage[] = [];
  for (const entry of payload?.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const to = normalizePhone(change.value?.metadata?.display_phone_number ?? "");
      for (const m of change.value?.messages ?? []) {
        let body = m.text?.body ?? "";
        let buttonId: string | undefined;
        let mediaId: string | undefined;
        let mediaType: "audio" | undefined;
        let mimeType: string | undefined;

        if (m.interactive?.button_reply) {
          buttonId = m.interactive.button_reply.id;
          body = m.interactive.button_reply.title;
        } else if (m.interactive?.list_reply) {
          buttonId = m.interactive.list_reply.id;
          body = m.interactive.list_reply.title;
        } else if (m.audio) {
          mediaId = m.audio.id;
          mediaType = "audio";
          mimeType = m.audio.mime_type;
        }

        messages.push({
          fromPhone: normalizePhone(m.from),
          toPhone: to,
          body,
          providerMessageId: m.id,
          timestamp: new Date(Number(m.timestamp) * 1000),
          buttonId,
          mediaId,
          mediaType,
          mimeType,
        });
      }
    }
  }
  return messages;
}

/**
 * Resolves a webhook media id (e.g. a voice note) to a short-lived download
 * URL. Meta expires these URLs within minutes, so callers must fetch the
 * audio immediately — only the media id is ever persisted (see VoiceNote).
 */
export async function fetchMetaMediaUrl(mediaId: string, accessToken: string): Promise<string> {
  const res = await fetch(`https://graph.facebook.com/v20.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Meta media lookup failed (${res.status}): ${text}`);
  }
  const data = (await res.json()) as { url?: string };
  if (!data.url) throw new Error("Meta media lookup returned no URL");
  return data.url;
}

// Meta's fields are usually digit-only already, but strip any stray
// spaces/dashes defensively so this always matches the clinic.whatsappNumber
// stored in the DB (which must also be entered as clean E.164, e.g. +15551234567).
function normalizePhone(raw: string): string {
  return `+${raw.replace(/[^\d]/g, "")}`;
}
