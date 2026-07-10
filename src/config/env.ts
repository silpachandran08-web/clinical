import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const env = {
  databaseUrl: required("DATABASE_URL"),

  anthropicApiKey: required("ANTHROPIC_API_KEY"),
  // Haiku 4.5 handles this workload (Arabic/English chat + reliable tool
  // calling) at ~1/3 the input and output price of Sonnet; combined with
  // prompt caching in the orchestrator it makes per-conversation cost cents.
  claudeModel: process.env.CLAUDE_MODEL ?? "claude-haiku-4-5-20251001",

  sessionSecret: required("SESSION_SECRET"),

  emailProvider: (process.env.EMAIL_PROVIDER ?? "console") as "console" | "resend",
  resend: {
    apiKey: process.env.RESEND_API_KEY ?? "",
    fromEmail: process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
  },

  // Unifonic is the fallback provider for any clinic that hasn't configured
  // its own Meta WhatsApp credentials yet (see Clinic.whatsapp* fields and
  // src/whatsapp/index.ts) — still global since Unifonic isn't per-clinic yet.
  unifonic: {
    appSid: process.env.UNIFONIC_APP_SID ?? "",
    senderId: process.env.UNIFONIC_SENDER_ID ?? "",
    apiBase: process.env.UNIFONIC_API_BASE ?? "https://api.unifonic.com",
    webhookSecret: process.env.UNIFONIC_WEBHOOK_SECRET ?? "",
  },

  staffEscalationWebhookUrl: process.env.STAFF_ESCALATION_WEBHOOK_URL ?? "",
};
