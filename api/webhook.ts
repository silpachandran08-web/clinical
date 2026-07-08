import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleWebhookMessage, handleWebhookVerification } from "../src/webhookHandler.js";
import { readRawBody } from "./_readRawBody.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    const result = handleWebhookVerification(req.query as Record<string, unknown>);
    res.status(result.status).send(result.body);
    return;
  }

  if (req.method === "POST") {
    const rawBody = await readRawBody(req);
    const parsedBody = rawBody ? JSON.parse(rawBody) : {};
    const result = await handleWebhookMessage({
      rawBody,
      headers: req.headers as Record<string, string>,
      parsedBody,
    });
    res.status(result.status).json(result.body);
    return;
  }

  res.status(405).end();
}
