export interface InboundWhatsAppMessage {
  fromPhone: string; // E.164
  toPhone: string; // clinic's WhatsApp number, used to resolve which clinic
  body: string;
  providerMessageId: string;
  timestamp: Date;
}

// Every WhatsApp BSP (Unifonic, Meta direct, Twilio, ...) speaks a different
// wire format. Everything above this interface — the orchestrator, the
// booking core — never sees provider-specific shapes, so switching or
// adding a provider never touches conversation logic.
export interface WhatsAppProvider {
  sendMessage(toPhone: string, body: string): Promise<void>;
  parseWebhookPayload(rawBody: unknown): InboundWhatsAppMessage[];
  verifyWebhookRequest(headers: Record<string, string | undefined>, rawBody: string): boolean;
}
