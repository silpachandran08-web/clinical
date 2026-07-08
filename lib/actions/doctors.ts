"use server";

import { revalidatePath } from "next/cache";
import { createDoctor, createDoctorSchema, setDoctorActive } from "@/src/adminHandlers";

export async function addDoctorAction(formData: FormData) {
  const days = formData.getAll("days").map(Number);
  const startTime = String(formData.get("startTime") ?? "09:00");
  const endTime = String(formData.get("endTime") ?? "17:00");
  const slotDurationMinutes = Number(formData.get("slotDurationMinutes") ?? 20);

  const payload = createDoctorSchema.parse({
    clinicId: String(formData.get("clinicId")),
    departmentId: String(formData.get("departmentId")),
    name: String(formData.get("name") ?? ""),
    workingHours: days.map((dayOfWeek) => ({ dayOfWeek, startTime, endTime, slotDurationMinutes })),
  });

  await createDoctor(payload);
  revalidatePath("/admin/doctors");
  revalidatePath("/admin");
}

export async function toggleDoctorActiveAction(formData: FormData) {
  const doctorId = String(formData.get("doctorId"));
  const currentlyActive = formData.get("active") === "true";
  await setDoctorActive(doctorId, !currentlyActive);
  revalidatePath("/admin/doctors");
}
