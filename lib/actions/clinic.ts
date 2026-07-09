"use server";

import { revalidatePath } from "next/cache";
import { updateClinic, updateClinicSchema, updateWhatsAppCredentials, updateWhatsAppCredentialsSchema } from "@/src/adminHandlers";
import { getSession } from "@/lib/session";

export async function saveClinicAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");

  const payload = updateClinicSchema.parse({
    name: String(formData.get("name") ?? ""),
    whatsappNumber: String(formData.get("whatsappNumber") ?? ""),
    timezone: String(formData.get("timezone") ?? "") || undefined,
    defaultLocale: (String(formData.get("defaultLocale") ?? "") || undefined) as "AR" | "EN" | undefined,
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
