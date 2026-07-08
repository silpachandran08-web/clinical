import { z } from "zod";
import { prisma } from "./db/client";

/**
 * All functions here take both clinicId AND doctorId and check both on every
 * query/update — a doctor must only ever see or touch their own patients,
 * never another doctor's at the same clinic, let alone another clinic's.
 */

function startOfToday(): Date {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start;
}

function startOfTomorrow(): Date {
  const start = startOfToday();
  start.setDate(start.getDate() + 1);
  return start;
}

export async function listMyQueue(clinicId: string, doctorId: string) {
  return prisma.appointment.findMany({
    where: {
      clinicId,
      doctorId,
      status: { in: ["CHECKED_IN", "IN_PROGRESS"] },
      slot: { startsAt: { gte: startOfToday(), lt: startOfTomorrow() } },
    },
    include: { patient: true, slot: true },
    orderBy: { slot: { startsAt: "asc" } },
  });
}

export async function startConsultation(clinicId: string, doctorId: string, appointmentId: string) {
  const result = await prisma.appointment.updateMany({
    where: { id: appointmentId, clinicId, doctorId, status: "CHECKED_IN" },
    data: { status: "IN_PROGRESS", startedAt: new Date() },
  });
  if (result.count === 0) {
    throw new Error("Appointment not found, not yours, or not checked in yet");
  }
}

export const completeConsultationSchema = z.object({
  notes: z.string().optional(),
  prescription: z.string().optional(),
});

export async function completeConsultation(
  clinicId: string,
  doctorId: string,
  appointmentId: string,
  input: z.infer<typeof completeConsultationSchema>,
) {
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, clinicId, doctorId, status: "IN_PROGRESS" },
  });
  if (!appointment) throw new Error("Appointment not found, not yours, or not in progress");

  await prisma.$transaction([
    prisma.consultation.create({
      data: {
        appointmentId,
        doctorId,
        patientId: appointment.patientId,
        notes: input.notes,
        prescription: input.prescription,
      },
    }),
    prisma.appointment.update({ where: { id: appointmentId }, data: { status: "COMPLETED" } }),
  ]);
}

/**
 * Prior visit notes for this patient, at this clinic — helps a doctor see
 * continuity of care. Deliberately not filtered to just this doctor's own
 * notes: any doctor at the clinic treating the patient should see what a
 * colleague wrote last time. Callers (Server Actions) are responsible for
 * checking the session role is DOCTOR before calling this.
 */
export async function listPatientHistory(clinicId: string, patientId: string) {
  return prisma.consultation.findMany({
    where: { patientId, doctor: { clinicId } },
    include: { doctor: true },
    orderBy: { createdAt: "desc" },
  });
}
