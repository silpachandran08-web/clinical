// Uses the Web Crypto API (not node:crypto) so this same code runs in both
// the Edge middleware and Node Server Actions without a runtime-specific fork.

export const SESSION_COOKIE_NAME = "admin_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

const encoder = new TextEncoder();

function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export async function createSessionToken(secret: string): Promise<string> {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const key = await getKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(String(expiresAt)));
  return `${expiresAt}.${toHex(signature)}`;
}

export async function verifySessionToken(token: string | undefined, secret: string): Promise<boolean> {
  if (!token) return false;
  const [expiresAtRaw, signatureHex] = token.split(".");
  const expiresAt = Number(expiresAtRaw);
  if (!expiresAt || !signatureHex || Date.now() > expiresAt) return false;

  const key = await getKey(secret);
  const expectedSignature = await crypto.subtle.sign("HMAC", key, encoder.encode(String(expiresAt)));
  return timingSafeEqual(toHex(expectedSignature), signatureHex);
}
