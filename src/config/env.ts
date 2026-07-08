import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const env = {
  databaseUrl: required("DATABASE_URL"),

  anthropicApiKey: required("ANTHROPIC_API_KEY"),
  claudeModel: process.env.CLAUDE_MODEL ?? "claude-sonnet-5",

  sessionSecret: required("SESSION_SECRET"),

  emailProvider: (process.env.EMAIL_PROVIDER ?? "console") as "console" | "resend",
  resend: {
    apiKey: process.env.RESEND_API_KEY ?? "",
    fromEmail: process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
  },

  whatsappProvider: (process.env.WHATSAPP_PROVIDER ?? "unifonic") as "unifonic" | "meta",

  unifonic: {
    appSid: process.env.UNIFONIC_APP_SID ?? "",
    senderId: process.env.UNIFONIC_SENDER_ID ?? "",
    apiBase: process.env.UNIFONIC_API_BASE ?? "https://api.unifonic.com",
    webhookSecret: process.env.UNIFONIC_WEBHOOK_SECRET ?? "",
  },

  meta: {
    phoneNumberId: process.env.META_PHONE_NUMBER_ID ?? "",
    accessToken: process.env.META_ACCESS_TOKEN ?? "",
    verifyToken: process.env.META_VERIFY_TOKEN ?? "",
    appSecret: process.env.META_APP_SECRET ?? "",
  },

  staffEscalationWebhookUrl: process.env.STAFF_ESCALATION_WEBHOOK_URL ?? "",
};
