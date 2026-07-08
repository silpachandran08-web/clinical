import { env } from "../config/env.js";
import { MetaCloudProvider } from "./metaCloudProvider.js";
import type { WhatsAppProvider } from "./provider.js";
import { UnifonicProvider } from "./unifonicProvider.js";

export function createWhatsAppProvider(): WhatsAppProvider {
  return env.whatsappProvider === "meta" ? new MetaCloudProvider() : new UnifonicProvider();
}

export type { InboundWhatsAppMessage, WhatsAppProvider } from "./provider.js";
