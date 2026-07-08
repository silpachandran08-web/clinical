import { prisma } from "../db/client.js";
import { SlotUnavailableError } from "./errors.js";

export interface AvailabilityQuery {
  clinicId: string;
  doctorId?: string;
  specialty?: string;
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
        ...(query.specialty ? { specialty: query.specialty } : {}),
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
}

/**
 * Books a slot atomically: the `updateMany` guard only flips status when it
 * is still OPEN, so two patients racing for the same slot can never both
 * succeed — the loser gets SlotUnavailableError and the orchestrator offers
 * alternatives instead of silently double-booking the doctor.
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

    const appointment = await tx.appointment.create({
      data: {
        clinicId: params.clinicId,
        doctorId: slot.doctorId,
        patientId: patient.id,
        slotId: slot.id,
        reason: params.reason,
      },
    });

    return { appointmentId: appointment.id, doctorName: slot.doctor.name, startsAt: slot.startsAt };
  });
}

export async function cancelAppointment(clinicId: string, appointmentId: string) {
  return prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.findFirst({
      where: { id: appointmentId, clinicId },
    });
    if (!appointment) throw new Error("Appointment not found");

    await tx.appointment.update({ where: { id: appointmentId }, data: { status: "CANCELLED" } });
    await tx.slot.update({ where: { id: appointment.slotId }, data: { status: "OPEN" } });
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
