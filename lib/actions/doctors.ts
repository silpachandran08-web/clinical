"use server";

import { revalidatePath } from "next/cache";
import { createDoctor, createDoctorSchema, setDoctorActive } from "@/src/adminHandlers";
import { getSession } from "@/lib/session";

export async function addDoctorAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");

  const days = formData.getAll("days").map(Number);
  const startTime = String(formData.get("startTime") ?? "09:00");
  const endTime = String(formData.get("endTime") ?? "17:00");
  const slotDurationMinutes = Number(formData.get("slotDurationMinutes") ?? 20);

  const payload = createDoctorSchema.parse({
    departmentId: String(formData.get("departmentId")),
    name: String(formData.get("name") ?? ""),
    workingHours: days.map((dayOfWeek) => ({ dayOfWeek, startTime, endTime, slotDurationMinutes })),
  });

  await createDoctor(session.clinicId, payload);
  revalidatePath("/admin/doctors");
  revalidatePath("/admin");
}

export async function toggleDoctorActiveAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");

  const doctorId = String(formData.get("doctorId"));
  const currentlyActive = formData.get("active") === "true";
  await setDoctorActive(session.clinicId, doctorId, !currentlyActive);
  revalidatePath("/admin/doctors");
}
