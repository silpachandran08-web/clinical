import Fastify from "fastify";
import { env } from "./config/env.js";
import { registerAdminRoutes } from "./routes/admin.js";
import { registerWebhookRoutes } from "./routes/webhook.js";

const app = Fastify({ logger: true });

// Capture the raw body alongside the parsed JSON so webhook handlers can
// verify HMAC signatures against the exact bytes the provider signed.
app.addContentTypeParser("application/json", { parseAs: "string" }, (request, body, done) => {
  (request as any).rawBody = body as string;
  try {
    done(null, body ? JSON.parse(body as string) : {});
  } catch (err) {
    done(err as Error, undefined);
  }
});

app.get("/health", async () => ({ status: "ok" }));

await registerWebhookRoutes(app);
await registerAdminRoutes(app);

app.listen({ port: env.port, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`clinic-whatsapp-assistant listening on ${address}`);
});
