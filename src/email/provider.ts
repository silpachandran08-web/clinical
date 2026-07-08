export interface EmailProvider {
  sendOtpEmail(to: string, code: string): Promise<void>;
}
