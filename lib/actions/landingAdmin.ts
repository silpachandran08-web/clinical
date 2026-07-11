"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { env } from "@/src/config/env";
import { LANDING_ADMIN_COOKIE_NAME, signGateToken, timingSafeEqual, verifyGateToken } from "@/lib/landingAdminAuth";
import { setLandingVariant, type LandingVariant } from "@/src/landingSettings";
import type { LandingAdminFormState } from "@/lib/landingAdminFormState";

export async function verifyLandingPasswordAction(
  _prev: LandingAdminFormState,
  formData: FormData,
): Promise<LandingAdminFormState> {
  const password = String(formData.get("password") ?? "");

  if (!env.landingAdminPassword || !timingSafeEqual(password, env.landingAdminPassword)) {
    return { error: "Incorrect password" };
  }

  const token = await signGateToken(env.sessionSecret);
  const cookieStore = await cookies();
  cookieStore.set(LANDING_ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  revalidatePath("/landing_page");
  return {};
}

async function requireGate() {
  const cookieStore = await cookies();
  const token = cookieStore.get(LANDING_ADMIN_COOKIE_NAME)?.value;
  const ok = await verifyGateToken(token, env.sessionSecret);
  if (!ok) throw new Error("Not authenticated");
}

export async function setLandingVariantAction(formData: FormData) {
  await requireGate();

  const variant = String(formData.get("variant") ?? "");
  if (variant !== "classic" && variant !== "animated" && variant !== "bento") throw new Error("Invalid variant");

  await setLandingVariant(variant as LandingVariant);
  revalidatePath("/landing_page");
  revalidatePath("/");
}

export async function landingLogoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(LANDING_ADMIN_COOKIE_NAME);
  revalidatePath("/landing_page");
}
