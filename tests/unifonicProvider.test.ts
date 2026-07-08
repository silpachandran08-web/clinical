import { describe, expect, it } from "vitest";
import { UnifonicProvider } from "../src/whatsapp/unifonicProvider.js";

describe("UnifonicProvider.parseWebhookPayload", () => {
  const provider = new UnifonicProvider();

  it("normalizes Saudi phone numbers and maps message fields", () => {
    const messages = provider.parseWebhookPayload({
      messages: [
        {
          from: "966501234567",
          to: "+966112345678",
          text: "مرحبا، أريد حجز موعد",
          id: "wamid.abc123",
          timestamp: "2026-08-02T09:00:00Z",
        },
      ],
    });

    expect(messages).toHaveLength(1);
    expect(messages[0].fromPhone).toBe("+966501234567");
    expect(messages[0].toPhone).toBe("+966112345678");
    expect(messages[0].body).toBe("مرحبا، أريد حجز موعد");
    expect(messages[0].providerMessageId).toBe("wamid.abc123");
  });

  it("returns an empty array when the payload has no messages", () => {
    expect(provider.parseWebhookPayload({})).toEqual([]);
  });
});

describe("UnifonicProvider.verifyWebhookRequest", () => {
  it("allows requests through in dev mode when no webhook secret is configured", () => {
    const provider = new UnifonicProvider();
    expect(provider.verifyWebhookRequest({}, "{}")).toBe(true);
  });
});
