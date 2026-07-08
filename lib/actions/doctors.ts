"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createDoctor,
  createDoctorSchema,
  deleteDoctor,
  setDoctorActive,
  updateDoctor,
  updateDoctorSchema,
} from "@/src/adminHandlers";
import { getSession } from "@/lib/session";

function parseWorkingHoursFromForm(formData: FormData) {
  const days = formData.getAll("days").map(Number);
  const startTime = String(formData.get("startTime") ?? "09:00");
  const endTime = String(formData.get("endTime") ?? "17:00");
  const slotDurationMinutes = Number(formData.get("slotDurationMinutes") ?? 20);
  return days.map((dayOfWeek) => ({ dayOfWeek, startTime, endTime, slotDurationMinutes }));
}

export async function addDoctorAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");

  const payload = createDoctorSchema.parse({
    departmentId: String(formData.get("departmentId")),
    name: String(formData.get("name") ?? ""),
    workingHours: parseWorkingHoursFromForm(formData),
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

export async function editDoctorAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");

  const doctorId = String(formData.get("doctorId"));
  const payload = updateDoctorSchema.parse({
    departmentId: String(formData.get("departmentId")),
    name: String(formData.get("name") ?? ""),
    workingHours: parseWorkingHoursFromForm(formData),
  });

  await updateDoctor(session.clinicId, doctorId, payload);
  revalidatePath("/admin/doctors");
  revalidatePath("/admin");
  redirect("/admin/doctors");
}

export async function deleteDoctorAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");

  const doctorId = String(formData.get("doctorId"));
  try {
    await deleteDoctor(session.clinicId, doctorId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not delete doctor";
    redirect(`/admin/doctors?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/admin/doctors");
  revalidatePath("/admin");
  redirect("/admin/doctors");
}
