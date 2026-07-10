import { z } from "zod";
import { prisma } from "./db/client";
import * as bookingService from "./scheduling/bookingService";
import { getDatePartsInTimezone, startOfDayInTimezone, zonedTimeToUtc } from "./scheduling/timezone";

const DAY_MS = 24 * 60 * 60 * 1000;
// A little over 3 missed AutoRefresh polls (~5s each) before a doctor's
// heartbeat is considered stale — long enough to absorb a slow request or
// two, short enough that a closed browser tab shows up as unavailable
// within a few seconds of the front desk glancing at the screen.
const AVAILABILITY_STALE_MS = 20_000;

/** "Today"/"tomorrow" as observed in the clinic's own timezone, not the server's (see src/scheduling/timezone.ts). */
function startOfToday(timeZone: string): Date {
  return startOfDayInTimezone(new Date(), timeZone);
}

function startOfTomorrow(timeZone: string): Date {
  return new Date(startOfToday(timeZone).getTime() + DAY_MS);
}

export async function listTodayAppointments(clinicId: string, timeZone: string) {
  return prisma.appointment.findMany({
    where: { clinicId, slot: { startsAt: { gte: startOfToday(timeZone), lt: startOfTomorrow(timeZone) } } },
    include: { doctor: true, patient: true, slot: true },
    orderBy: { slot: { startsAt: "asc" } },
  });
}

/** "YYYY-MM-DD" as observed in the clinic's timezone — used for building/parsing URL params, never UTC (which would roll back a day for any timezone ahead of UTC, e.g. Riyadh, UTC+3). */
function formatLocalDate(date: Date, timeZone: string): string {
  const { year, month, day } = getDatePartsInTimezone(date, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** ISO "YYYY-MM-DD" -> midnight in the clinic's timezone, or today if missing/invalid. */
export function getDayParam(param: string | undefined, timeZone: string): Date {
  if (param) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(param);
    if (match) {
      return zonedTimeToUtc(Number(match[1]), Number(match[2]), Number(match[3]), 0, 0, timeZone);
    }
  }
  return startOfToday(timeZone);
}

export function formatDayParam(date: Date, timeZone: string): string {
  return formatLocalDate(date, timeZone);
}

/**
 * Each active doctor's status for one day: live "who's with a patient /
 * who's waiting" (only ever populated for today — future appointments can't
 * be checked in yet) plus that day's open slots, so the receptionist can
 * see availability before starting the booking flow at all.
 */
export async function listDoctorsStatusForDay(clinicId: string, date: Date) {
  const dayStart = date;
  const dayEnd = new Date(dayStart.getTime() + DAY_MS);

  const doctors = await prisma.doctor.findMany({
    where: { clinicId, active: true },
    include: {
      department: true,
      appointments: {
        where: {
          slot: { startsAt: { gte: dayStart, lt: dayEnd } },
          status: { in: ["CHECKED_IN", "IN_PROGRESS"] },
        },
        include: { patient: true, slot: true },
        orderBy: { slot: { startsAt: "asc" } },
      },
      slots: {
        where: { startsAt: { gte: dayStart, lt: dayEnd } },
        orderBy: { startsAt: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const now = new Date();
  return doctors.map((d) => {
    const openSlots = d.slots.filter((s) => s.status === "OPEN" && s.startsAt > now);
    // The day's last slot has already ended — true for any past day, and
    // for today once working hours are over. Distinguishes "closed for the
    // day" from "genuinely fully booked within hours still to come".
    const lastSlot = d.slots[d.slots.length - 1];
    const dayEnded = d.slots.length > 0 && now >= lastSlot.endsAt;
    const isLive = d.isAvailable && d.lastSeenAt !== null && now.getTime() - d.lastSeenAt.getTime() < AVAILABILITY_STALE_MS;
    return {
      id: d.id,
      name: d.name,
      department: d.department,
      isLive,
      inProgressWith: d.appointments.find((a) => a.status === "IN_PROGRESS") ?? null,
      waiting: d.appointments.filter((a) => a.status === "CHECKED_IN"),
      openSlots,
      totalSlots: d.slots.length,
      dayEnded,
    };
  });
}

export async function checkInAppointment(clinicId: string, appointmentId: string) {
  const result = await prisma.appointment.updateMany({
    where: { id: appointmentId, clinicId, status: "CONFIRMED" },
    data: { status: "CHECKED_IN", checkedInAt: new Date() },
  });
  if (result.count === 0) {
    throw new Error("Appointment not found, or not in a state that can be checked in");
  }
}

/** Sunday of the week containing `param` (an ISO "YYYY-MM-DD" date), or of the current week if omitted/invalid — all in the clinic's timezone. */
export function getWeekStart(param: string | undefined, timeZone: string): Date {
  const day = getDayParam(param, timeZone);
  const dayOfWeek = getDatePartsInTimezone(day, timeZone);
  const weekday = new Date(Date.UTC(dayOfWeek.year, dayOfWeek.month - 1, dayOfWeek.day)).getUTCDay();
  return new Date(day.getTime() - weekday * DAY_MS);
}

export function formatWeekParam(date: Date, timeZone: string): string {
  return formatLocalDate(date, timeZone);
}

export interface WeekDay {
  date: Date;
  slots: { id: string; startsAt: Date; status: string }[];
}

/**
 * A doctor's full week, one entry per day, each slot tagged OPEN/BOOKED/BLOCKED
 * so the UI can render a flight-booking-style grid — green for open, red for
 * taken — instead of just a flat list of what's still free.
 */
export async function listWeekSlots(clinicId: string, doctorId: string, weekStart: Date): Promise<WeekDay[]> {
  const weekEnd = new Date(weekStart.getTime() + 7 * DAY_MS);

  const slots = await prisma.slot.findMany({
    where: { doctorId, doctor: { clinicId }, startsAt: { gte: weekStart, lt: weekEnd } },
    orderBy: { startsAt: "asc" },
    select: { id: true, startsAt: true, status: true },
  });

  const days: WeekDay[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart.getTime() + i * DAY_MS);
    const dayEnd = new Date(date.getTime() + DAY_MS);
    days.push({
      date,
      slots: slots.filter((s) => s.startsAt >= date && s.startsAt < dayEnd),
    });
  }
  return days;
}

/**
 * Several doctors' slots across several consecutive weeks in ONE query,
 * bucketed into per-doctor week grids. Replaces calling listWeekSlots
 * doctor-by-doctor, week-by-week (4 sequential queries per doctor) on the
 * front desk Doctors tab — one clinic-wide query regardless of headcount.
 */
export async function listMultiWeekSlotsForDoctors(
  clinicId: string,
  doctorIds: string[],
  firstWeekStart: Date,
  weekCount: number
): Promise<Map<string, WeekDay[][]>> {
  const result = new Map<string, WeekDay[][]>();
  if (doctorIds.length === 0) return result;

  const rangeEnd = new Date(firstWeekStart.getTime() + weekCount * 7 * DAY_MS);
  const slots = await prisma.slot.findMany({
    where: { doctorId: { in: doctorIds }, doctor: { clinicId }, startsAt: { gte: firstWeekStart, lt: rangeEnd } },
    orderBy: { startsAt: "asc" },
    select: { id: true, doctorId: true, startsAt: true, status: true },
  });

  // Bucket once by doctor + day offset instead of re-scanning the slot list per grid cell.
  const byDoctorDay = new Map<string, { id: string; startsAt: Date; status: string }[]>();
  for (const slot of slots) {
    const dayIndex = Math.floor((slot.startsAt.getTime() - firstWeekStart.getTime()) / DAY_MS);
    const key = `${slot.doctorId}:${dayIndex}`;
    const entry = { id: slot.id, startsAt: slot.startsAt, status: slot.status };
    const bucket = byDoctorDay.get(key);
    if (bucket) bucket.push(entry);
    else byDoctorDay.set(key, [entry]);
  }

  for (const doctorId of doctorIds) {
    const weeks: WeekDay[][] = [];
    for (let w = 0; w < weekCount; w++) {
      const days: WeekDay[] = [];
      for (let i = 0; i < 7; i++) {
        const dayIndex = w * 7 + i;
        days.push({
          date: new Date(firstWeekStart.getTime() + dayIndex * DAY_MS),
          slots: byDoctorDay.get(`${doctorId}:${dayIndex}`) ?? [],
        });
      }
      weeks.push(days);
    }
    result.set(doctorId, weeks);
  }
  return result;
}

export async function bookWalkIn(params: {
  clinicId: string;
  slotId: string;
  patientPhone: string;
  patientName: string;
}) {
  return bookingService.bookSlot({ ...params, bookedByStaff: true });
}

/** Looks a patient up by phone or email — the "is this person already registered" check. */
export async function searchPatients(clinicId: string, query: string) {
  const q = query.trim();
  if (!q) return [];

  return prisma.patient.findMany({
    where: {
      clinicId,
      OR: [
        { phone: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
      ],
    },
    include: { _count: { select: { appointments: true } } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
}

/**
 * Open AI-escalated follow-up requests, urgent ones pinned to the top and
 * then oldest-first (a fair queue — whoever has waited longest gets helped
 * next). Patient names are resolved in one batched lookup by phone since
 * escalations store only the phone (the patient may not be registered yet).
 */
export async function listOpenEscalations(clinicId: string) {
  const escalations = await prisma.staffEscalation.findMany({
    where: { clinicId, status: "OPEN" },
    orderBy: [{ urgent: "desc" }, { createdAt: "asc" }],
  });
  if (escalations.length === 0) return [];

  const patients = await prisma.patient.findMany({
    where: { clinicId, phone: { in: escalations.map((e) => e.patientPhone) } },
    select: { phone: true, name: true },
  });
  const nameByPhone = new Map(patients.map((p) => [p.phone, p.name]));

  return escalations.map((e) => ({
    id: e.id,
    patientPhone: e.patientPhone,
    patientName: nameByPhone.get(e.patientPhone) ?? null,
    reason: e.reason,
    urgent: e.urgent,
    createdAt: e.createdAt,
  }));
}

export async function resolveEscalation(clinicId: string, escalationId: string) {
  const result = await prisma.staffEscalation.updateMany({
    where: { id: escalationId, clinicId, status: "OPEN" },
    data: { status: "RESOLVED", resolvedAt: new Date() },
  });
  if (result.count === 0) {
    throw new Error("Escalation not found or already handled");
  }
}

/** Looks up which patient an escalation is about, scoped by clinicId — used to hand the conversation back to the AI with a staff instruction. */
export async function getEscalationPatientPhone(clinicId: string, escalationId: string): Promise<string> {
  const escalation = await prisma.staffEscalation.findFirst({
    where: { id: escalationId, clinicId },
    select: { patientPhone: true },
  });
  if (!escalation) throw new Error("Escalation not found");
  return escalation.patientPhone;
}

export const createPatientSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
});

/** Registers a walk-in's contact info directly, independent of booking a slot. */
export async function createPatient(clinicId: string, input: z.infer<typeof createPatientSchema>) {
  return prisma.patient.upsert({
    where: { clinicId_phone: { clinicId, phone: input.phone } },
    update: { name: input.name, email: input.email || undefined },
    create: { clinicId, name: input.name, phone: input.phone, email: input.email || undefined },
  });
}
