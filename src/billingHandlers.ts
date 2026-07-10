import { z } from "zod";
import { prisma } from "./db/client";
import { startOfDayInTimezone } from "./scheduling/timezone";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Today's appointments with everything the front desk needs to collect
 * payment: base consultation fee, extra charges, what's already been paid,
 * and the remaining balance. Cancelled/no-show visits are excluded — there
 * is nothing to collect.
 */
export async function listDayBilling(clinicId: string, timeZone: string) {
  const dayStart = startOfDayInTimezone(new Date(), timeZone);
  const dayEnd = new Date(dayStart.getTime() + DAY_MS);

  const appointments = await prisma.appointment.findMany({
    where: {
      clinicId,
      slot: { startsAt: { gte: dayStart, lt: dayEnd } },
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
    },
    include: {
      doctor: { select: { name: true, consultationFee: true } },
      patient: { select: { name: true, phone: true } },
      slot: { select: { startsAt: true } },
      charges: true,
      payments: { where: { status: "PAID" } },
    },
    orderBy: { slot: { startsAt: "asc" } },
  });

  return appointments.map((a) => {
    const consultationFee = Number(a.doctor.consultationFee);
    const chargesTotal = a.charges.reduce((sum, c) => sum + Number(c.amount), 0);
    const total = consultationFee + chargesTotal;
    const paid = a.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    // Round to halalas so float noise never leaves a 0.004 SAR "balance".
    const balance = Math.max(0, Math.round((total - paid) * 100) / 100);
    return {
      appointmentId: a.id,
      startsAt: a.slot.startsAt,
      appointmentStatus: a.status,
      patientName: a.patient.name,
      patientPhone: a.patient.phone,
      doctorName: a.doctor.name,
      consultationFee,
      charges: a.charges.map((c) => ({ description: c.description, amount: Number(c.amount) })),
      total,
      paid,
      balance,
      payments: a.payments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        method: p.method,
        reference: p.reference,
        createdAt: p.createdAt,
      })),
    };
  });
}

/**
 * Collected today / this month — the Billing tab's stat cards. Today's
 * outstanding is derived from listDayBilling's rows by the caller, so the
 * two functions can run in one parallel batch without duplicate queries.
 */
export async function getCollectedSummary(clinicId: string, timeZone: string) {
  const dayStart = startOfDayInTimezone(new Date(), timeZone);
  const monthStart = new Date(dayStart);
  monthStart.setUTCDate(1);

  const [todayAgg, monthAgg] = await Promise.all([
    prisma.payment.aggregate({
      where: { clinicId, status: "PAID", createdAt: { gte: dayStart } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { clinicId, status: "PAID", createdAt: { gte: monthStart } },
      _sum: { amount: true },
    }),
  ]);

  return {
    collectedToday: Number(todayAgg._sum.amount ?? 0),
    collectedThisMonth: Number(monthAgg._sum.amount ?? 0),
  };
}

export const recordPaymentSchema = z.object({
  appointmentId: z.string().min(1),
  amount: z.number().positive(),
  method: z.enum(["POS_CARD", "CASH"]),
  reference: z.string().trim().max(100).optional(),
});

/**
 * Records money collected at the front desk (Phase 1: the receptionist
 * charges the standalone POS terminal or takes cash, then keys the result
 * in here). Rejects overpayment so a typo can't book more than is owed.
 */
export async function recordPayment(
  clinicId: string,
  recordedById: string,
  input: z.infer<typeof recordPaymentSchema>
) {
  const appointment = await prisma.appointment.findFirst({
    where: { id: input.appointmentId, clinicId },
    include: {
      doctor: { select: { consultationFee: true } },
      charges: { select: { amount: true } },
      payments: { where: { status: "PAID" }, select: { amount: true } },
    },
  });
  if (!appointment) throw new Error("Appointment not found");

  const total =
    Number(appointment.doctor.consultationFee) +
    appointment.charges.reduce((sum, c) => sum + Number(c.amount), 0);
  const paid = appointment.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const balance = Math.round((total - paid) * 100) / 100;
  if (balance <= 0) throw new Error("This appointment is already fully paid");
  if (input.amount > balance + 0.005) {
    throw new Error(`Amount exceeds the remaining balance (SAR ${balance.toFixed(2)})`);
  }

  return prisma.payment.create({
    data: {
      clinicId,
      appointmentId: input.appointmentId,
      amount: input.amount,
      method: input.method,
      status: "PAID",
      reference: input.reference || undefined,
      recordedById,
    },
  });
}

export const updatePosSettingsSchema = z.object({
  posProvider: z.enum(["MANUAL", "GEIDEA", "NEOLEAP"]),
  posTerminalName: z.string().trim().max(100).optional(),
});

/** Admin-only: which POS terminal/acquirer the clinic uses (Phase 1 stores the choice; terminal APIs plug in behind it later). */
export async function updatePosSettings(
  clinicId: string,
  input: z.infer<typeof updatePosSettingsSchema>
) {
  return prisma.clinic.update({
    where: { id: clinicId },
    data: {
      posProvider: input.posProvider,
      posTerminalName: input.posTerminalName || null,
    },
  });
}
