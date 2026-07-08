import { env } from "../config/env";
import { MetaCloudProvider } from "./metaCloudProvider";
import type { WhatsAppProvider } from "./provider";
import { UnifonicProvider } from "./unifonicProvider";

export function createWhatsAppProvider(): WhatsAppProvider {
  return env.whatsappProvider === "meta" ? new MetaCloudProvider() : new UnifonicProvider();
}

export type { InboundWhatsAppMessage, WhatsAppProvider } from "./provider";
