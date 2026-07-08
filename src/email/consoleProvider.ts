import type { EmailProvider } from "./provider";

/** Dev-mode provider: no signup, no cost — just logs the code so you can test the flow locally. */
export class ConsoleEmailProvider implements EmailProvider {
  async sendOtpEmail(to: string, code: string): Promise<void> {
    console.log(`[dev email] Sign-in code for ${to}: ${code} (valid 10 minutes)`);
  }
}
