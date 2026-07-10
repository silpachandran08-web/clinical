"use server";

import { revalidatePath } from "next/cache";
import { updateClinic, updateClinicSchema, updateWhatsAppCredentials, updateWhatsAppCredentialsSchema } from "@/src/adminHandlers";
import { getSession } from "@/lib/session";

export async function saveClinicAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");

  const isOpen24_7 = formData.get("isOpen24_7") === "on";

  // Collect selected closed days (0=Sun, 1=Mon, ..., 6=Sat)
  const closedDays = [];
  for (let i = 0; i < 7; i++) {
    if (formData.get(`closedDay_${i}`) === "on") {
      closedDays.push(i);
    }
  }

  const payload = updateClinicSchema.parse({
    name: String(formData.get("name") ?? ""),
    whatsappNumber: String(formData.get("whatsappNumber") ?? ""),
    address: String(formData.get("address") ?? "") || undefined,
    phone: String(formData.get("phone") ?? "") || undefined,
    receptionistName: String(formData.get("receptionistName") ?? "") || undefined,
    timezone: String(formData.get("timezone") ?? "") || undefined,
    defaultLocale: (String(formData.get("defaultLocale") ?? "") || undefined) as "AR" | "EN" | undefined,
    isOpen24_7: isOpen24_7 || undefined,
    openingTime: (String(formData.get("openingTime") ?? "") || undefined),
    closingTime: (String(formData.get("closingTime") ?? "") || undefined),
    weekendDays: closedDays.length > 0 ? closedDays.join(",") : undefined,
  });

  await updateClinic(session.clinicId, payload);

  revalidatePath("/admin");
  revalidatePath("/admin/clinic");
}

export async function saveWhatsAppCredentialsAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");

  const payload = updateWhatsAppCredentialsSchema.parse({
    phoneNumberId: String(formData.get("phoneNumberId") ?? ""),
    accessToken: String(formData.get("accessToken") ?? ""),
    appSecret: String(formData.get("appSecret") ?? ""),
  });

  await updateWhatsAppCredentials(session.clinicId, payload);

  revalidatePath("/admin/clinic");
}
