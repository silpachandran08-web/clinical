"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createDepartment,
  createDepartmentSchema,
  deleteDepartment,
  saveLabFieldDefinitions,
  saveLabFieldDefinitionsSchema,
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
    kind: String(formData.get("kind") ?? "MEDICAL"),
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
    kind: String(formData.get("kind") ?? "MEDICAL"),
  });
  await updateDepartment(session.clinicId, departmentId, payload);

  revalidatePath("/admin/departments");
  revalidatePath("/admin/doctors");
  revalidatePath("/admin/flow");
  revalidatePath("/admin");
  redirect("/admin/departments");
}

/** Replaces a lab department's whole field set at once — see LabFieldEditor, which serializes the ordered fields as a hidden JSON field. */
export async function saveLabFieldDefinitionsAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");

  const departmentId = String(formData.get("departmentId") ?? "");
  const fieldsJson = String(formData.get("fields") ?? "[]");
  const payload = saveLabFieldDefinitionsSchema.parse(JSON.parse(fieldsJson));

  try {
    await saveLabFieldDefinitions(session.clinicId, departmentId, payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save lab fields";
    redirect(`/admin/departments/${departmentId}/edit?error=${encodeURIComponent(message)}`);
  }

  revalidatePath(`/admin/departments/${departmentId}/edit`);
  revalidatePath("/lab");
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
