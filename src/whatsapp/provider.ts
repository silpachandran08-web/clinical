export interface InboundWhatsAppMessage {
  fromPhone: string; // E.164
  toPhone: string; // clinic's WhatsApp number, used to resolve which clinic
  body: string;
  providerMessageId: string;
  timestamp: Date;
  buttonId?: string; // set if this is a button click response
  mediaId?: string; // provider media id, set for audio/voice messages
  mediaType?: "audio"; // only audio is handled today (patient voice notes)
  mimeType?: string;
}

export interface WhatsAppButton {
  id: string;
  title: string; // button label (max 20 chars)
}

export interface WhatsAppListItem {
  id: string;
  title: string;
  description?: string;
}

// Every WhatsApp BSP (Unifonic, Meta direct, Twilio, ...) speaks a different
// wire format. Everything above this interface — the orchestrator, the
// booking core — never sees provider-specific shapes, so switching or
// adding a provider never touches conversation logic.
export interface WhatsAppProvider {
  sendMessage(toPhone: string, body: string): Promise<void>;
  sendButtonMessage(
    toPhone: string,
    body: string,
    buttons: WhatsAppButton[]
  ): Promise<void>;
  sendListMessage(
    toPhone: string,
    body: string,
    listItems: WhatsAppListItem[],
    buttonLabel?: string
  ): Promise<void>;
  parseWebhookPayload(rawBody: unknown): InboundWhatsAppMessage[];
  verifyWebhookRequest(headers: Record<string, string | undefined>, rawBody: string): boolean;
}
