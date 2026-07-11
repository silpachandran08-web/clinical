// Standalone signed-cookie gate for /landing_page — deliberately not the
// multi-tenant session in lib/auth.ts (no userId/clinicId/role involved,
// just "does this browser know the shared password").

export const LANDING_ADMIN_COOKIE_NAME = "landing_admin";
const GATE_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

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

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export async function signGateToken(secret: string): Promise<string> {
  const body = base64UrlEncode(JSON.stringify({ ok: true, expiresAt: Date.now() + GATE_DURATION_MS }));
  const signature = await sign(body, secret);
  return `${body}.${signature}`;
}

export async function verifyGateToken(token: string | undefined, secret: string): Promise<boolean> {
  if (!token) return false;
  const [body, signature] = token.split(".");
  if (!body || !signature) return false;

  const expectedSignature = await sign(body, secret);
  if (!timingSafeEqual(expectedSignature, signature)) return false;

  try {
    const parsed = JSON.parse(base64UrlDecode(body)) as { ok: boolean; expiresAt: number };
    return parsed.ok === true && Date.now() < parsed.expiresAt;
  } catch {
    return false;
  }
}
