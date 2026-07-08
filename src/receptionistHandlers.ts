import { z } from "zod";
import { prisma } from "./db/client";
import * as bookingService from "./scheduling/bookingService";

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

export async function listTodayAppointments(clinicId: string) {
  return prisma.appointment.findMany({
    where: { clinicId, slot: { startsAt: { gte: startOfToday(), lt: startOfTomorrow() } } },
    include: { doctor: true, patient: true, slot: true },
    orderBy: { slot: { startsAt: "asc" } },
  });
}

/** For the "who's with a patient right now vs who's waiting" board. */
export async function listDoctorsWithTodayStatus(clinicId: string) {
  const doctors = await prisma.doctor.findMany({
    where: { clinicId, active: true },
    include: {
      appointments: {
        where: {
          slot: { startsAt: { gte: startOfToday(), lt: startOfTomorrow() } },
          status: { in: ["CHECKED_IN", "IN_PROGRESS"] },
        },
        include: { patient: true, slot: true },
        orderBy: { slot: { startsAt: "asc" } },
      },
    },
    orderBy: { name: "asc" },
  });

  return doctors.map((d) => ({
    id: d.id,
    name: d.name,
    inProgressWith: d.appointments.find((a) => a.status === "IN_PROGRESS") ?? null,
    waiting: d.appointments.filter((a) => a.status === "CHECKED_IN"),
  }));
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

/** Sunday of the week containing `param` (an ISO "YYYY-MM-DD" date), or of the current week if omitted/invalid. */
export function getWeekStart(param?: string): Date {
  let start: Date;
  if (param) {
    const parsed = new Date(`${param}T00:00:00`);
    start = isNaN(parsed.getTime()) ? new Date() : parsed;
  } else {
    start = new Date();
  }
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

export function formatWeekParam(date: Date): string {
  return date.toISOString().slice(0, 10);
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
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const slots = await prisma.slot.findMany({
    where: { doctorId, doctor: { clinicId }, startsAt: { gte: weekStart, lt: weekEnd } },
    orderBy: { startsAt: "asc" },
    select: { id: true, startsAt: true, status: true },
  });

  const days: WeekDay[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    const dayEnd = new Date(date);
    dayEnd.setDate(dayEnd.getDate() + 1);
    days.push({
      date,
      slots: slots.filter((s) => s.startsAt >= date && s.startsAt < dayEnd),
    });
  }
  return days;
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
