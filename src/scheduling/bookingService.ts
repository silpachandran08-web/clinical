import { prisma } from "../db/client";
import { SlotUnavailableError } from "./errors";

export interface AvailabilityQuery {
  clinicId: string;
  doctorId?: string;
  departmentName?: string;
  from: Date;
  to: Date;
}

export async function getAvailability(query: AvailabilityQuery) {
  return prisma.slot.findMany({
    where: {
      status: "OPEN",
      startsAt: { gte: query.from, lt: query.to },
      doctor: {
        clinicId: query.clinicId,
        active: true,
        ...(query.doctorId ? { id: query.doctorId } : {}),
        ...(query.departmentName ? { department: { name: query.departmentName } } : {}),
      },
    },
    include: { doctor: true },
    orderBy: { startsAt: "asc" },
    take: 20,
  });
}

export interface BookSlotParams {
  clinicId: string;
  slotId: string;
  patientPhone: string;
  patientName: string;
  reason?: string;
  bookedByStaff?: boolean; // true for receptionist walk-ins, false/omitted for WhatsApp bookings
}

/**
 * Books a slot atomically: the `updateMany` guard only flips status when it
 * is still OPEN, so two patients racing for the same slot can never both
 * succeed — the loser gets SlotUnavailableError and the orchestrator offers
 * alternatives instead of silently double-booking the doctor.
 *
 * Also supersedes, not stacks: a patient who already has a CONFIRMED
 * appointment with this same doctor and books another (e.g. "actually can
 * I get an earlier time") has the old one cancelled and its slot freed in
 * the same transaction — one active appointment per patient per doctor,
 * whether the rebooking came from the WhatsApp AI or a receptionist walk-in.
 * Deliberately scoped to CONFIRMED only: a CHECKED_IN/IN_PROGRESS visit is
 * happening right now and should never be silently replaced.
 */
export async function bookSlot(params: BookSlotParams) {
  return prisma.$transaction(async (tx) => {
    const slot = await tx.slot.findFirst({
      where: { id: params.slotId, doctor: { clinicId: params.clinicId } },
      include: { doctor: true },
    });
    if (!slot) throw new SlotUnavailableError(params.slotId);

    const claim = await tx.slot.updateMany({
      where: { id: params.slotId, status: "OPEN" },
      data: { status: "BOOKED" },
    });
    if (claim.count === 0) throw new SlotUnavailableError(params.slotId);

    const patient = await tx.patient.upsert({
      where: { clinicId_phone: { clinicId: params.clinicId, phone: params.patientPhone } },
      update: { name: params.patientName },
      create: { clinicId: params.clinicId, phone: params.patientPhone, name: params.patientName },
    });

    const superseded = await tx.appointment.findMany({
      where: { clinicId: params.clinicId, patientId: patient.id, doctorId: slot.doctorId, status: "CONFIRMED" },
      select: { id: true, slotId: true },
    });
    for (const old of superseded) {
      await tx.appointment.update({ where: { id: old.id }, data: { status: "CANCELLED" } });
      await tx.slot.update({ where: { id: old.slotId }, data: { status: "OPEN" } });
    }

    const appointment = await tx.appointment.create({
      data: {
        clinicId: params.clinicId,
        doctorId: slot.doctorId,
        patientId: patient.id,
        slotId: slot.id,
        reason: params.reason,
        bookedByStaff: params.bookedByStaff ?? false,
      },
    });

    return { appointmentId: appointment.id, doctorName: slot.doctor.name, startsAt: slot.startsAt };
  });
}

export async function cancelAppointment(clinicId: string, appointmentId: string) {
  return prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.findFirst({
      where: { id: appointmentId, clinicId, status: { in: ["CONFIRMED", "CHECKED_IN"] } },
    });
    if (!appointment) throw new Error("Appointment not found, or not in a state that can be cancelled");

    await tx.appointment.update({ where: { id: appointmentId }, data: { status: "CANCELLED" } });
    await tx.slot.update({ where: { id: appointment.slotId }, data: { status: "OPEN" } });
  });
}

/**
 * Moves an existing appointment to a different slot (and, if the new slot
 * belongs to a different doctor, reassigns the doctor too) instead of
 * cancel-and-rebook — keeps the same appointment row (id, reason,
 * bookedByStaff, createdAt) intact. Same atomic-claim pattern as bookSlot:
 * only a still-OPEN slot can be claimed, so two staff racing to edit the
 * same slot can never both succeed.
 */
export async function rescheduleAppointment(clinicId: string, appointmentId: string, newSlotId: string) {
  return prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.findFirst({
      where: { id: appointmentId, clinicId, status: { in: ["CONFIRMED", "CHECKED_IN"] } },
    });
    if (!appointment) throw new Error("Appointment not found, or not in a state that can be edited");

    if (appointment.slotId === newSlotId) return;

    const newSlot = await tx.slot.findFirst({
      where: { id: newSlotId, doctor: { clinicId } },
    });
    if (!newSlot) throw new SlotUnavailableError(newSlotId);

    const claim = await tx.slot.updateMany({
      where: { id: newSlotId, status: "OPEN" },
      data: { status: "BOOKED" },
    });
    if (claim.count === 0) throw new SlotUnavailableError(newSlotId);

    await tx.slot.update({ where: { id: appointment.slotId }, data: { status: "OPEN" } });
    await tx.appointment.update({
      where: { id: appointmentId },
      data: { slotId: newSlotId, doctorId: newSlot.doctorId },
    });
  });
}

export async function getPatientAppointments(clinicId: string, patientPhone: string) {
  return prisma.appointment.findMany({
    where: {
      clinicId,
      status: "CONFIRMED",
      patient: { phone: patientPhone },
    },
    include: { doctor: true, slot: true },
    orderBy: { slot: { startsAt: "asc" } },
  });
}

/**
 * Past visits only (completed, cancelled, no-show) — logistics only. Deliberately
 * selects just `followUpDate` off the consultation, never `notes`/`prescription`:
 * that's real clinical content and stays doctor-eyes-only, not something the
 * WhatsApp AI reads back to a patient.
 */
export async function getPatientVisitHistory(clinicId: string, patientPhone: string, limit = 5) {
  return prisma.appointment.findMany({
    where: {
      clinicId,
      status: { in: ["COMPLETED", "CANCELLED", "NO_SHOW"] },
      patient: { phone: patientPhone },
    },
    include: { doctor: true, slot: true, consultation: { select: { followUpDate: true } } },
    orderBy: { slot: { startsAt: "desc" } },
    take: limit,
  });
}
