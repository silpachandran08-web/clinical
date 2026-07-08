"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  inviteStaff,
  inviteStaffSchema,
  removeStaff,
  updateStaff,
  updateStaffSchema,
} from "@/src/adminHandlers";
import { getSession } from "@/lib/session";

export async function inviteStaffAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");

  const role = String(formData.get("role") ?? "");
  const payload = inviteStaffSchema.parse({
    email: String(formData.get("email") ?? ""),
    role,
    doctorId: role === "DOCTOR" ? String(formData.get("doctorId") ?? "") || undefined : undefined,
  });

  await inviteStaff(session.clinicId, payload);
  revalidatePath("/admin/staff");
}

export async function editStaffAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");

  const userId = String(formData.get("userId"));
  const role = String(formData.get("role") ?? "");
  const payload = updateStaffSchema.parse({
    role,
    doctorId: role === "DOCTOR" ? String(formData.get("doctorId") ?? "") || undefined : undefined,
  });

  try {
    await updateStaff(session.clinicId, userId, payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not update staff member";
    redirect(`/admin/staff?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/admin/staff");
  revalidatePath("/admin/doctors");
  redirect("/admin/staff");
}

export async function removeStaffAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");

  const userId = String(formData.get("userId"));
  try {
    await removeStaff(session.clinicId, userId, session.userId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not remove staff member";
    redirect(`/admin/staff?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/admin/staff");
  redirect("/admin/staff");
}
