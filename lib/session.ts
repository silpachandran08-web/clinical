import { cookies } from "next/headers";
import { env } from "@/src/config/env";
import { SESSION_COOKIE_NAME, verifySessionToken, type SessionPayload } from "@/lib/auth";

/**
 * proxy.ts already guarantees a valid session + correct role for anything
 * under /admin, /receptionist, /doctor — this is what pages call to find out
 * *which* clinic/user that session belongs to.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token, env.sessionSecret);
}
