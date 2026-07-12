"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createDepartment,
  createDepartmentSchema,
  deleteDepartment,
  updateDepartment,
  updateDepartmentSchema,
} from "@/src/adminHandlers";
import { getSession } from "@/lib/session";

export async function addDepartmentAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");

  const payload = createDepartmentSchema.parse({
    name: String(formData.get("name") ?? ""),
    isBookable: formData.get("isBookable") === "on",
  });
  await createDepartment(session.clinicId, payload);

  revalidatePath("/admin/departments");
  revalidatePath("/admin/doctors");
  revalidatePath("/admin");
}

export async function editDepartmentAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");

  const departmentId = String(formData.get("departmentId"));
  const payload = updateDepartmentSchema.parse({
    name: String(formData.get("name") ?? ""),
    isBookable: formData.get("isBookable") === "on",
  });
  await updateDepartment(session.clinicId, departmentId, payload);

  revalidatePath("/admin/departments");
  revalidatePath("/admin/doctors");
  revalidatePath("/admin/flow");
  revalidatePath("/admin");
  redirect("/admin/departments");
}

export async function deleteDepartmentAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");

  const departmentId = String(formData.get("departmentId"));
  try {
    await deleteDepartment(session.clinicId, departmentId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not delete department";
    redirect(`/admin/departments?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/admin/departments");
  revalidatePath("/admin/doctors");
  revalidatePath("/admin/flow");
  revalidatePath("/admin");
  redirect("/admin/departments");
}
