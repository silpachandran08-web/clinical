"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  completeConsultation,
  completeConsultationSchema,
  startConsultation,
  startNextConsultation,
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
  });

  await completeConsultation(session.clinicId, session.doctorId, appointmentId, payload);
  revalidatePath("/doctor");
  redirect("/doctor");
}
