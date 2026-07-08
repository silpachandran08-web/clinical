import { env } from "../config/env";
import type { EmailProvider } from "./provider";

/** Production provider — resend.com. Needs RESEND_API_KEY + a verified sender domain. */
export class ResendEmailProvider implements EmailProvider {
  async sendOtpEmail(to: string, code: string): Promise<void> {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.resend.apiKey}`,
      },
      body: JSON.stringify({
        from: env.resend.fromEmail,
        to,
        subject: "Your sign-in code",
        text: `Your sign-in code is ${code}. It expires in 10 minutes. If you didn't request this, ignore this email.`,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Resend send failed (${res.status}): ${text}`);
    }
  }
}
