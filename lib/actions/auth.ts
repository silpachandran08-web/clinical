"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/src/config/env";
import { createSessionToken, SESSION_COOKIE_NAME, type UserRole } from "@/lib/auth";
import { getSession } from "@/lib/session";
import type { AuthFormState } from "@/lib/authFormState";
import { findUserByEmail, registerClinicAndAdmin, requestOtp, verifyOtpCode } from "@/src/authService";
import { setDoctorAvailability } from "@/src/doctorHandlers";

const ROLE_HOME: Record<UserRole, string> = {
  CLINIC_ADMIN: "/admin",
  RECEPTIONIST: "/receptionist",
  DOCTOR: "/doctor",
  NURSE: "/nurse",
  LAB: "/lab",
};

async function setSession(userId: string, clinicId: string, role: UserRole, doctorId?: string | null) {
  const token = await createSessionToken({ userId, clinicId, role, doctorId }, env.sessionSecret);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const step = String(formData.get("step") ?? "start");
  const email = String(formData.get("email") ?? "").trim();

  if (step === "start") {
    if (!email) return { step: "start", error: "Enter your email" };
    const user = await findUserByEmail(email);
    if (!user) {
      return { step: "start", email, error: "No account with that email — register your clinic instead." };
    }
    await requestOtp(email);
    return { step: "code", email };
  }

  const code = String(formData.get("code") ?? "").trim();
  const valid = await verifyOtpCode(email, code);
  if (!valid) return { step: "code", email, error: "Incorrect or expired code" };

  const user = await findUserByEmail(email);
  if (!user) return { step: "start", error: "No account with that email" };

  await setSession(user.id, user.clinicId, user.role, user.doctorId);
  if (user.role === "DOCTOR" && user.doctorId) {
    await setDoctorAvailability(user.clinicId, user.doctorId, true);
  }
  redirect(ROLE_HOME[user.role]);
}

export async function registerAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const step = String(formData.get("step") ?? "start");
  const email = String(formData.get("email") ?? "").trim();
  const clinicName = String(formData.get("clinicName") ?? "").trim();

  if (step === "start") {
    if (!email || !clinicName) return { step: "start", email, clinicName, error: "Enter a clinic name and email" };
    const existing = await findUserByEmail(email);
    if (existing) {
      return {
        step: "start",
        email,
        clinicName,
        error: "An account already exists for that email — log in instead.",
      };
    }
    await requestOtp(email);
    return { step: "code", email, clinicName };
  }

  const code = String(formData.get("code") ?? "").trim();
  const valid = await verifyOtpCode(email, code);
  if (!valid) return { step: "code", email, clinicName, error: "Incorrect or expired code" };

  const existing = await findUserByEmail(email);
  if (existing) {
    return { step: "start", error: "An account already exists for that email — log in instead." };
  }

  const { clinic, user } = await registerClinicAndAdmin({ clinicName, email });
  await setSession(user.id, clinic.id, user.role);
  redirect(ROLE_HOME[user.role]);
}

export async function logout() {
  const session = await getSession();
  if (session?.role === "DOCTOR" && session.doctorId) {
    await setDoctorAvailability(session.clinicId, session.doctorId, false);
  }

  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}
