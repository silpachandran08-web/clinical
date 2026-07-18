import { prisma } from "@/src/db/client";
import type { Clinic } from "@prisma/client";
import { createWhatsAppProvider } from "@/src/whatsapp";
import crypto from "node:crypto";

const verificationCodes = new Map<string, { code: string; expiresAt: Date; attempts: number }>();

const messages = {
  AR: {
    sending: "جاري إرسال رمز التحقق...",
    sent: "تم إرسال رمز التحقق (OTP) إلى رقم WhatsApp هذا.\n\nأدخل الرمز المكون من 6 أرقام:",
    invalid: "الرمز غير صحيح. حاول مرة أخرى.",
    expired: "انتهت صلاحية الرمز. طلب رمز جديد؟",
    tooMany: "عدد محاولات كثير جداً. حاول لاحقاً.",
    verified: "✅ تم التحقق بنجاح!\n\nيمكنك الآن حجز موعدك.",
  },
  EN: {
    sending: "Sending verification code...",
    sent: "A verification code (OTP) has been sent to this WhatsApp number.\n\nEnter the 6-digit code:",
    invalid: "Invalid code. Try again.",
    expired: "Code expired. Request a new one?",
    tooMany: "Too many attempts. Try later.",
    verified: "✅ Verified!\n\nYou can now book your appointment.",
  },
};

export async function sendVerificationCode(phone: string, clinic: Clinic): Promise<void> {
  const code = crypto.randomBytes(3).toString("hex").substring(0, 6).toUpperCase();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  verificationCodes.set(`${clinic.id}_${phone}`, { code, expiresAt, attempts: 0 });

  const provider = createWhatsAppProvider(clinic);
  const msg = messages[clinic.defaultLocale];

  await provider.sendMessage(phone, msg.sending);

  // Send the actual code (in production, this would be through SMS/WhatsApp template)
  await provider.sendMessage(phone, `${msg.sent}\n\nYour code: ${code}`);
}

export async function verifyCode(
  phone: string,
  userProvidedCode: string,
  clinic: Clinic
): Promise<{ verified: boolean; message: string }> {
  const key = `${clinic.id}_${phone}`;
  const stored = verificationCodes.get(key);
  const msg = messages[clinic.defaultLocale];

  if (!stored) {
    return { verified: false, message: msg.sent };
  }

  if (stored.expiresAt < new Date()) {
    verificationCodes.delete(key);
    return { verified: false, message: msg.expired };
  }

  stored.attempts++;
  if (stored.attempts > 5) {
    verificationCodes.delete(key);
    return { verified: false, message: msg.tooMany };
  }

  if (stored.code !== userProvidedCode.trim().toUpperCase()) {
    verificationCodes.set(key, stored);
    return { verified: false, message: msg.invalid };
  }

  // Code is valid
  verificationCodes.delete(key);

  // Mark patient as verified in database
  await prisma.patient.updateMany({
    where: { clinicId: clinic.id, phone },
    data: { verified: true },
  });

  return { verified: true, message: msg.verified };
}

export interface VerificationStatus {
  hasCode: boolean;
  expiresAt?: Date;
  attemptsRemaining: number;
}

export function getVerificationStatus(phone: string, clinic: Clinic): VerificationStatus {
  const key = `${clinic.id}_${phone}`;
  const stored = verificationCodes.get(key);

  if (!stored) {
    return { hasCode: false, attemptsRemaining: 5 };
  }

  return {
    hasCode: true,
    expiresAt: stored.expiresAt,
    attemptsRemaining: Math.max(0, 5 - stored.attempts),
  };
}

export function clearVerificationCode(phone: string, clinic: Clinic): void {
  verificationCodes.delete(`${clinic.id}_${phone}`);
}
