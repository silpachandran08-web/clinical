"use server";

import { revalidatePath } from "next/cache";
import { inviteStaff, inviteStaffSchema } from "@/src/adminHandlers";
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
