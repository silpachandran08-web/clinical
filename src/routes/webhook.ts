import type { FastifyInstance } from "fastify";
import { handleWebhookMessage, handleWebhookVerification } from "../webhookHandler.js";

export async function registerWebhookRoutes(app: FastifyInstance) {
  app.get("/webhook/whatsapp", async (request, reply) => {
    const result = handleWebhookVerification(request.query as Record<string, unknown>);
    return reply.code(result.status).send(result.body);
  });

  app.post("/webhook/whatsapp", async (request, reply) => {
    const result = await handleWebhookMessage({
      rawBody: (request as any).rawBody as string,
      headers: request.headers as Record<string, string>,
      parsedBody: request.body,
    });
    return reply.code(result.status).send(result.body);
  });
}
