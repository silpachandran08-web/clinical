"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  completeConsultation,
  completeConsultationSchema,
  startConsultation,
  startNextConsultation,
  updatePatientDetails,
  updatePatientDetailsSchema,
} from "@/src/doctorHandlers";
import { getSession } from "@/lib/session";

function requireDoctorSession() {
  return getSession().then((session) => {
    if (!session || session.role !== "DOCTOR" || !session.doctorId) {
      throw new Error("Not authenticated as a doctor");
    }
    return session as typeof session & { doctorId: string };
  });
}

export async function startConsultationAction(formData: FormData) {
  const session = await requireDoctorSession();
  const appointmentId = String(formData.get("appointmentId"));
  await startConsultation(session.clinicId, session.doctorId, appointmentId);
  revalidatePath("/doctor");
}

export async function startNextConsultationAction() {
  const session = await requireDoctorSession();
  await startNextConsultation(session.clinicId, session.doctorId);
  revalidatePath("/doctor");
}

export async function completeConsultationAction(formData: FormData) {
  const session = await requireDoctorSession();
  const appointmentId = String(formData.get("appointmentId"));

  const payload = completeConsultationSchema.parse({
    notes: String(formData.get("notes") ?? "") || undefined,
    prescription: String(formData.get("prescription") ?? "") || undefined,
    weightKg: String(formData.get("weightKg") ?? "") || undefined,
    administeredTreatment: String(formData.get("administeredTreatment") ?? "") || undefined,
    followUpDays: String(formData.get("followUpDays") ?? "") || undefined,
  });

  await completeConsultation(session.clinicId, session.doctorId, appointmentId, payload);
  revalidatePath("/doctor");
  redirect("/doctor");
}

export async function updatePatientDetailsAction(formData: FormData) {
  const session = await requireDoctorSession();
  const patientId = String(formData.get("patientId"));

  const payload = updatePatientDetailsSchema.parse({
    age: String(formData.get("age") ?? "") || undefined,
    gender: String(formData.get("gender") ?? "") || undefined,
    medicalNotes: String(formData.get("medicalNotes") ?? "") || undefined,
  });

  await updatePatientDetails(session.clinicId, patientId, payload);
  revalidatePath(`/doctor/patients/${patientId}`);
}
