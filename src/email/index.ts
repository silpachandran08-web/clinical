import { env } from "../config/env";
import { ConsoleEmailProvider } from "./consoleProvider";
import { ResendEmailProvider } from "./resendProvider";
import type { EmailProvider } from "./provider";

export function createEmailProvider(): EmailProvider {
  return env.emailProvider === "resend" ? new ResendEmailProvider() : new ConsoleEmailProvider();
}

export type { EmailProvider } from "./provider";
