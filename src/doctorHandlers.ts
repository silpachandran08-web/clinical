import { z } from "zod";
import { Gender } from "@prisma/client";
import { prisma } from "./db/client";
import { startOfDayInTimezone } from "./scheduling/timezone";

/**
 * All functions here take both clinicId AND doctorId and check both on every
 * query/update — a doctor must only ever see or touch their own patients,
 * never another doctor's at the same clinic, let alone another clinic's.
 */

/** "Today"/"tomorrow" as observed in the clinic's own timezone, not the server's (see src/scheduling/timezone.ts). */
function startOfToday(timeZone: string): Date {
  return startOfDayInTimezone(new Date(), timeZone);
}

function startOfTomorrow(timeZone: string): Date {
  const start = startOfToday(timeZone);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

export async function listMyQueue(clinicId: string, doctorId: string, timeZone: string) {
  return prisma.appointment.findMany({
    where: {
      clinicId,
      doctorId,
      status: { in: ["CHECKED_IN", "IN_PROGRESS"] },
      slot: { startsAt: { gte: startOfToday(timeZone), lt: startOfTomorrow(timeZone) } },
    },
    include: { patient: true, slot: true },
    orderBy: { slot: { startsAt: "asc" } },
  });
}

export async function countCompletedToday(clinicId: string, doctorId: string, timeZone: string) {
  return prisma.appointment.count({
    where: {
      clinicId,
      doctorId,
      status: "COMPLETED",
      slot: { startsAt: { gte: startOfToday(timeZone), lt: startOfTomorrow(timeZone) } },
    },
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

/** Starts the longest-waiting checked-in patient, so the doctor doesn't have to scan the list and pick one. */
export async function startNextConsultation(clinicId: string, doctorId: string) {
  const clinic = await prisma.clinic.findUniqueOrThrow({ where: { id: clinicId }, select: { timezone: true } });
  const next = await prisma.appointment.findFirst({
    where: {
      clinicId,
      doctorId,
      status: "CHECKED_IN",
      slot: { startsAt: { gte: startOfToday(clinic.timezone), lt: startOfTomorrow(clinic.timezone) } },
    },
    orderBy: { slot: { startsAt: "asc" } },
  });
  if (!next) {
    throw new Error("No patients waiting");
  }
  await startConsultation(clinicId, doctorId, next.id);
}

export const completeConsultationSchema = z.object({
  notes: z.string().optional(),
  prescription: z.string().optional(),
  followUpDays: z.coerce.number().int().positive().optional(),
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

  let followUpDate: Date | undefined;
  if (input.followUpDays) {
    followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + input.followUpDays);
  }

  await prisma.$transaction([
    prisma.consultation.create({
      data: {
        appointmentId,
        doctorId,
        patientId: appointment.patientId,
        notes: input.notes,
        prescription: input.prescription,
        followUpDate,
      },
    }),
    prisma.appointment.update({ where: { id: appointmentId }, data: { status: "COMPLETED" } }),
  ]);
}

/** Doctor enters current age; we store the birth year so age is always re-derived correctly on later visits. */
export function calculateAge(birthYear: number | null | undefined): number | null {
  if (!birthYear) return null;
  return new Date().getFullYear() - birthYear;
}

export const updatePatientDetailsSchema = z.object({
  age: z.coerce.number().int().min(0).max(130).optional(),
  gender: z.nativeEnum(Gender).optional(),
  medicalNotes: z.string().optional(),
});

export async function updatePatientDetails(
  clinicId: string,
  patientId: string,
  input: z.infer<typeof updatePatientDetailsSchema>,
) {
  const result = await prisma.patient.updateMany({
    where: { id: patientId, clinicId },
    data: {
      birthYear: input.age !== undefined ? new Date().getFullYear() - input.age : undefined,
      gender: input.gender,
      medicalNotes: input.medicalNotes,
    },
  });
  if (result.count === 0) {
    throw new Error("Patient not found");
  }
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
