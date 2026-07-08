"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/src/config/env";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function login(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (password !== env.adminPassword) {
    redirect("/admin/login?error=1");
  }

  const token = await createSessionToken(env.sessionSecret);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  redirect("/admin");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/admin/login");
}
