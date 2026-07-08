import type { IncomingMessage } from "node:http";

/**
 * Reads the exact raw bytes of a request body. Needed for the WhatsApp
 * webhook because signature verification (HMAC) fails the moment the body
 * is re-serialized from a parsed object instead of read verbatim — Vercel's
 * `req.body` convenience getter parses JSON for you, but by the time you
 * read that property you've lost the original byte sequence.
 */
export function readRawBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}
