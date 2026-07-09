import type { Clinic } from "@prisma/client";
import { MetaCloudProvider } from "./metaCloudProvider";
import type { WhatsAppProvider } from "./provider";
import { UnifonicProvider } from "./unifonicProvider";

type ClinicWhatsAppFields = Pick<
  Clinic,
  "whatsappPhoneNumberId" | "whatsappAccessToken" | "whatsappAppSecret"
>;

/**
 * Meta if this clinic has configured its own credentials, otherwise the
 * existing global-env Unifonic provider — lets clinics migrate onto their
 * own WhatsApp number one at a time instead of a single all-or-nothing
 * platform-wide switch.
 */
export function createWhatsAppProvider(clinic: ClinicWhatsAppFields): WhatsAppProvider {
  if (clinic.whatsappPhoneNumberId && clinic.whatsappAccessToken) {
    return new MetaCloudProvider({
      phoneNumberId: clinic.whatsappPhoneNumberId,
      accessToken: clinic.whatsappAccessToken,
      appSecret: clinic.whatsappAppSecret ?? "",
    });
  }
  return new UnifonicProvider();
}

export type { InboundWhatsAppMessage, WhatsAppProvider } from "./provider";
