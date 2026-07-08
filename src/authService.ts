import { env } from "./config/env";
import { prisma } from "./db/client";
import { createEmailProvider } from "./email/index";

const OTP_TTL_MS = 10 * 60 * 1000;
const emailProvider = createEmailProvider();

// Dev/test convenience: with no real email provider configured, this fixed
// code works for ANY email address so you can test registration/login
// without checking server logs for the real generated code. This is
// impossible to hit once EMAIL_PROVIDER=resend (production) — do not widen
// this check to also apply when a real provider is configured.
const DEV_BYPASS_CODE = "09876";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/** Same primitive for both login and registration — the OTP itself doesn't know which flow it's for. */
export async function requestOtp(email: string): Promise<void> {
  const normalized = normalizeEmail(email);
  const code = generateCode();
  await prisma.otpCode.create({
    data: { email: normalized, code, expiresAt: new Date(Date.now() + OTP_TTL_MS) },
  });
  await emailProvider.sendOtpEmail(normalized, code);
}

/** Validates and consumes a code. Does not touch the User table — callers decide what a valid code means for their flow. */
export async function verifyOtpCode(email: string, code: string): Promise<boolean> {
  const normalized = normalizeEmail(email);

  if (env.emailProvider === "console" && code === DEV_BYPASS_CODE) {
    return true;
  }

  const otp = await prisma.otpCode.findFirst({
    where: { email: normalized, code, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) return false;

  await prisma.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
  return true;
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
}

const TRIAL_DAYS = 7;

/** Registration: brand-new clinic + its first user (the admin who signed up). */
export async function registerClinicAndAdmin(params: { clinicName: string; email: string }) {
  const email = normalizeEmail(params.email);
  return prisma.$transaction(async (tx) => {
    const clinic = await tx.clinic.create({
      data: {
        name: params.clinicName,
        trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
      },
    });
    const user = await tx.user.create({
      data: { email, role: "CLINIC_ADMIN", clinicId: clinic.id },
    });
    return { clinic, user };
  });
}
