// Session tokens are signed with the Web Crypto API. proxy.ts (Next.js 16)
// and Server Actions both run on the Node.js runtime, so Buffer is fine here.

export const SESSION_COOKIE_NAME = "session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export type UserRole = "CLINIC_ADMIN" | "RECEPTIONIST" | "DOCTOR" | "NURSE" | "LAB";

export interface SessionPayload {
  userId: string;
  clinicId: string;
  role: UserRole;
  doctorId?: string | null; // set when role = DOCTOR, NURSE, or LAB
}

const encoder = new TextEncoder();

function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

async function sign(data: string, secret: string): Promise<string> {
  const key = await getKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Buffer.from(signature).toString("base64url");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export async function createSessionToken(payload: SessionPayload, secret: string): Promise<string> {
  const body = base64UrlEncode(JSON.stringify({ ...payload, expiresAt: Date.now() + SESSION_DURATION_MS }));
  const signature = await sign(body, secret);
  return `${body}.${signature}`;
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string,
): Promise<SessionPayload | null> {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expectedSignature = await sign(body, secret);
  if (!timingSafeEqual(expectedSignature, signature)) return null;

  try {
    const parsed = JSON.parse(base64UrlDecode(body)) as SessionPayload & { expiresAt: number };
    if (!parsed.expiresAt || Date.now() > parsed.expiresAt) return null;
    return { userId: parsed.userId, clinicId: parsed.clinicId, role: parsed.role, doctorId: parsed.doctorId };
  } catch {
    return null;
  }
}
