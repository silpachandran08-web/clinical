"use server";

import { revalidatePath } from "next/cache";
import { updateClinic, updateClinicSchema } from "@/src/adminHandlers";
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
