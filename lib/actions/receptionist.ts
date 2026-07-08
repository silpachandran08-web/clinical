"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  bookWalkIn,
  checkInAppointment,
  createPatient,
  createPatientSchema,
} from "@/src/receptionistHandlers";
import { getSession } from "@/lib/session";

export async function checkInAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");

  const appointmentId = String(formData.get("appointmentId"));
  await checkInAppointment(session.clinicId, appointmentId);
  revalidatePath("/receptionist");
}

export async function bookWalkInAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");

  const slotId = String(formData.get("slotId") ?? "");
  const patientPhone = String(formData.get("patientPhone") ?? "").trim();
  const patientName = String(formData.get("patientName") ?? "").trim();

  if (!slotId || !patientPhone || !patientName) {
    redirect(`/receptionist?doctorId=${formData.get("doctorId")}&error=missing`);
  }

  await bookWalkIn({ clinicId: session.clinicId, slotId, patientPhone, patientName });
  revalidatePath("/receptionist");
  redirect("/receptionist?booked=1");
}

export async function addPatientAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");

  const payload = createPatientSchema.parse({
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
  });

  await createPatient(session.clinicId, payload);
  revalidatePath("/receptionist");
  redirect(`/receptionist?patientQuery=${encodeURIComponent(payload.phone)}&added=1`);
}
