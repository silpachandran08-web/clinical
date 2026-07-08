"use server";

import { revalidatePath } from "next/cache";
import {
  createClinic,
  createClinicSchema,
  updateClinic,
  updateClinicSchema,
} from "@/src/adminHandlers";

export async function saveClinicAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const payload = {
    name: String(formData.get("name") ?? ""),
    whatsappNumber: String(formData.get("whatsappNumber") ?? ""),
    timezone: String(formData.get("timezone") ?? "") || undefined,
    defaultLocale: (String(formData.get("defaultLocale") ?? "") || undefined) as "AR" | "EN" | undefined,
  };

  if (id) {
    await updateClinic(updateClinicSchema.parse({ ...payload, id }));
  } else {
    await createClinic(createClinicSchema.parse(payload));
  }

  revalidatePath("/admin");
  revalidatePath("/admin/clinic");
}
