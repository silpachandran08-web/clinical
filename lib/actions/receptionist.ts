"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  bookWalkIn,
  checkInAppointment,
  createPatient,
  createPatientSchema,
  getEscalationPatientPhone,
  resolveEscalation,
} from "@/src/receptionistHandlers";
import { cancelAppointment, rescheduleAppointment } from "@/src/scheduling/bookingService";
import { getClinic } from "@/src/adminHandlers";
import { handleStaffInstruction } from "@/src/ai/orchestrator";
import { getSession } from "@/lib/session";

export async function checkInAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");

  const appointmentId = String(formData.get("appointmentId"));
  await checkInAppointment(session.clinicId, appointmentId);
  revalidatePath("/receptionist");
}

export async function cancelAppointmentAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");

  const appointmentId = String(formData.get("appointmentId"));
  await cancelAppointment(session.clinicId, appointmentId);
  revalidatePath("/receptionist");
}

export async function rescheduleAppointmentAction(appointmentId: string, newSlotId: string) {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");

  await rescheduleAppointment(session.clinicId, appointmentId, newSlotId);
  revalidatePath("/receptionist");
}

export async function listActiveDoctorsAction() {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");

  const { listDoctors } = await import("@/src/adminHandlers");
  const doctors = await listDoctors(session.clinicId);
  return doctors.filter((d) => d.active && d.department.isBookable);
}

export async function resolveEscalationAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");

  const escalationId = String(formData.get("escalationId"));
  await resolveEscalation(session.clinicId, escalationId);
  revalidatePath("/receptionist");
}

/**
 * The receptionist's alternative to manually chatting on WhatsApp: hand the
 * AI a plain-English instruction and let it carry the conversation forward
 * (with the clinic's real tools — it can actually book the slot staff
 * describe, not just say it will). Resolves the escalation on success since
 * the AI owns the conversation again; if it needs staff again later, a new
 * escalation will naturally appear via escalate_to_human.
 */
export async function sendStaffInstructionAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");

  const escalationId = String(formData.get("escalationId"));
  const instruction = String(formData.get("instruction") ?? "").trim();
  if (!instruction) throw new Error("Instruction cannot be empty");

  const [patientPhone, clinic] = await Promise.all([
    getEscalationPatientPhone(session.clinicId, escalationId),
    getClinic(session.clinicId),
  ]);

  await handleStaffInstruction({ clinic, patientPhone, instruction });
  await resolveEscalation(session.clinicId, escalationId);
  revalidatePath("/receptionist");
}

export async function bookWalkInAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");

  const slotId = String(formData.get("slotId") ?? "");
  const patientPhone = String(formData.get("patientPhone") ?? "").trim();
  const patientName = String(formData.get("patientName") ?? "").trim();

  const doctorId = String(formData.get("doctorId") ?? "");
  const carryPatient = `patientName=${encodeURIComponent(patientName)}&patientPhone=${encodeURIComponent(patientPhone)}`;

  if (!slotId || !patientPhone || !patientName) {
    redirect(`/receptionist?doctorId=${doctorId}&error=missing&${carryPatient}#assign-doctor`);
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

  const patient = await createPatient(session.clinicId, payload);
  revalidatePath("/receptionist");

  // Return patient object for client-side use (new unified booking flow)
  // If this was called from a form submission context, the component handles the result
  return patient;
}

export async function searchPatientsAction(query: string) {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");

  const { searchPatients } = await import("@/src/receptionistHandlers");
  return searchPatients(session.clinicId, query);
}

export async function listWeekSlotsAction(
  doctorId: string,
  weekStartStr: string
) {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");

  const { listWeekSlots } = await import("@/src/receptionistHandlers");
  const weekStart = new Date(weekStartStr);
  const week = await listWeekSlots(session.clinicId, doctorId, weekStart);

  return week.map((day: any) => ({
    ...day,
    date: day.date.toISOString(),
    slots: day.slots.map((slot: any) => ({
      ...slot,
      startsAt: slot.startsAt.toISOString(),
    })),
  }));
}
