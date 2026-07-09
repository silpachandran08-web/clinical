import { z } from "zod";
import { Gender } from "@prisma/client";
import { prisma } from "./db/client";
import { getDatePartsInTimezone, startOfDayInTimezone, zonedTimeToUtc } from "./scheduling/timezone";

export { getDayParam, formatDayParam } from "./receptionistHandlers";

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
  weightKg: z.coerce.number().positive().optional(),
  administeredTreatment: z.string().optional(),
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

  // Plain millisecond arithmetic on "now" rather than Date.setDate() — the
  // latter advances a calendar day in the server's own local timezone,
  // the exact bug already fixed everywhere else this session.
  const followUpDate = input.followUpDays
    ? new Date(Date.now() + input.followUpDays * 24 * 60 * 60 * 1000)
    : undefined;

  const [consultation] = await prisma.$transaction([
    prisma.consultation.create({
      data: {
        appointmentId,
        doctorId,
        patientId: appointment.patientId,
        notes: input.notes,
        prescription: input.prescription,
        weightKg: input.weightKg,
        administeredTreatment: input.administeredTreatment,
        followUpDate,
      },
    }),
    prisma.appointment.update({ where: { id: appointmentId }, data: { status: "COMPLETED" } }),
  ]);
  return consultation;
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
  doctorId: string,
  patientId: string,
  input: z.infer<typeof updatePatientDetailsSchema>,
) {
  const result = await prisma.patient.updateMany({
    where: { id: patientId, clinicId, appointments: { some: { doctorId } } },
    data: {
      birthYear: input.age !== undefined ? new Date().getFullYear() - input.age : undefined,
      gender: input.gender,
      medicalNotes: input.medicalNotes,
    },
  });
  if (result.count === 0) {
    throw new Error("Patient not found, or not one of your patients");
  }
}

/**
 * Patients this doctor has (or has had) an appointment with — the "her
 * patients" set. Unlike the receptionist's clinic-wide searchPatients, this
 * is scoped through the appointments relation so a doctor can never search
 * up a patient she's never actually treated, even by exact phone/email match.
 */
export async function searchMyPatients(clinicId: string, doctorId: string, query: string) {
  const q = query.trim();
  if (!q) return [];

  return prisma.patient.findMany({
    where: {
      clinicId,
      appointments: { some: { doctorId } },
      OR: [
        { phone: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
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

/** First of the month (from a "YYYY-MM" URL param, or the current month) in the clinic's own timezone. */
export function getMonthStart(param: string | undefined, timeZone: string): Date {
  const match = param ? /^(\d{4})-(\d{2})$/.exec(param) : null;
  if (match) {
    return zonedTimeToUtc(Number(match[1]), Number(match[2]), 1, 0, 0, timeZone);
  }
  const { year, month } = getDatePartsInTimezone(new Date(), timeZone);
  return zonedTimeToUtc(year, month, 1, 0, 0, timeZone);
}

export function formatMonthParam(monthStart: Date, timeZone: string): string {
  const { year, month } = getDatePartsInTimezone(monthStart, timeZone);
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** "YYYY-MM" of the month `delta` months away from `monthStart` (e.g. -1 for previous, +1 for next) — for calendar Prev/Next links. */
export function shiftMonthParam(monthStart: Date, delta: number, timeZone: string): string {
  const { year, month } = getDatePartsInTimezone(monthStart, timeZone);
  const totalMonths = year * 12 + (month - 1) + delta;
  const newYear = Math.floor(totalMonths / 12);
  const newMonth = (totalMonths % 12) + 1;
  return `${newYear}-${String(newMonth).padStart(2, "0")}`;
}

/** This doctor's appointment count per calendar day (clinic-local) across one month — powers the calendar's dot indicators. */
export async function listAppointmentDayCounts(
  clinicId: string,
  doctorId: string,
  monthStart: Date,
  timeZone: string,
): Promise<Record<string, number>> {
  const { year, month } = getDatePartsInTimezone(monthStart, timeZone);
  const nextMonthStart = zonedTimeToUtc(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1, 1, 0, 0, timeZone);

  const appointments = await prisma.appointment.findMany({
    where: {
      clinicId,
      doctorId,
      status: { notIn: ["CANCELLED"] },
      slot: { startsAt: { gte: monthStart, lt: nextMonthStart } },
    },
    select: { slot: { select: { startsAt: true } } },
  });

  const counts: Record<string, number> = {};
  for (const a of appointments) {
    const { year: y, month: m, day: d } = getDatePartsInTimezone(a.slot.startsAt, timeZone);
    const key = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

/**
 * This doctor's appointments on one calendar day (clinic-local), any status —
 * powers the "click a day on the calendar" list. Whether that list reads as
 * "scheduled" or "visited" to the doctor is just copy the caller chooses
 * based on whether the day is in the past; the query itself doesn't filter
 * by status so a past day still shows no-shows/cancellations, not just
 * completed visits.
 */
export async function listDayAppointments(clinicId: string, doctorId: string, dayStart: Date, timeZone: string) {
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  return prisma.appointment.findMany({
    where: {
      clinicId,
      doctorId,
      slot: { startsAt: { gte: dayStart, lt: dayEnd } },
    },
    include: { patient: true, slot: true, consultation: { select: { id: true } } },
    orderBy: { slot: { startsAt: "asc" } },
  });
}

/** One completed visit's full detail for the printable prescription — scoped to this doctor at this clinic, same tenant-isolation convention as everything else in this file. */
export async function getConsultationForPrint(clinicId: string, doctorId: string, consultationId: string) {
  return prisma.consultation.findFirst({
    where: { id: consultationId, doctorId, doctor: { clinicId } },
    include: { patient: true, doctor: { include: { department: true, clinic: true } } },
  });
}

/**
 * Splits the "Name (detail); Name2 (detail2)" string both PrescriptionBuilder
 * and AdministeredTreatmentBuilder compose into structured rows for the
 * printout — detail is optional (a medicine entered with no timing selected
 * has no parentheses at all).
 */
export function parseMedicineList(raw: string | null | undefined): { name: string; detail: string }[] {
  if (!raw) return [];
  return raw
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const match = /^(.*?)\s*\(([^)]*)\)$/.exec(entry);
      return match ? { name: match[1].trim(), detail: match[2].trim() } : { name: entry, detail: "" };
    });
}
