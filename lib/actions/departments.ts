"use server";

import { revalidatePath } from "next/cache";
import { createDepartment, createDepartmentSchema } from "@/src/adminHandlers";

export async function addDepartmentAction(formData: FormData) {
  const payload = createDepartmentSchema.parse({
    clinicId: String(formData.get("clinicId")),
    name: String(formData.get("name") ?? ""),
  });
  await createDepartment(payload);
  revalidatePath("/admin/departments");
  revalidatePath("/admin/doctors");
  revalidatePath("/admin");
}
