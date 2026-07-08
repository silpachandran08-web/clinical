"use server";

import { revalidatePath } from "next/cache";
import { createDepartment, createDepartmentSchema } from "@/src/adminHandlers";
import { getSession } from "@/lib/session";

export async function addDepartmentAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");

  const payload = createDepartmentSchema.parse({ name: String(formData.get("name") ?? "") });
  await createDepartment(session.clinicId, payload);

  revalidatePath("/admin/departments");
  revalidatePath("/admin/doctors");
  revalidatePath("/admin");
}
