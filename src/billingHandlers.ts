import { z } from "zod";
import { prisma } from "./db/client";
import { getPosProvider } from "./payments/provider";
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

/** Clinic-scoped appointment lookup + remaining balance (rounded to halalas). */
async function getAppointmentBalance(clinicId: string, appointmentId: string) {
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, clinicId },
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
  return { appointment, balance };
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
  const { balance } = await getAppointmentBalance(clinicId, input.appointmentId);
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

// How long a PENDING terminal charge may sit before the poller gives up on
// it. Generous: the patient may still be fishing their card out of a bag.
const TERMINAL_CHARGE_TIMEOUT_MS = 3 * 60 * 1000;

/**
 * Push the appointment's outstanding balance to the clinic's POS terminal.
 * Creates a PENDING Payment first so the attempt is on record even if the
 * acquirer call fails, then hands the amount to the provider. The front desk
 * polls pollTerminalCharge until the patient taps and the acquirer answers.
 */
export async function startTerminalCharge(clinicId: string, recordedById: string, appointmentId: string) {
  const clinic = await prisma.clinic.findUniqueOrThrow({ where: { id: clinicId } });
  const provider = getPosProvider(clinic); // throws a friendly error if not configured

  const { balance } = await getAppointmentBalance(clinicId, appointmentId);
  if (balance <= 0) throw new Error("This appointment is already fully paid");

  // A retry supersedes any charge still marked PENDING for this appointment —
  // otherwise an abandoned attempt would block reconciliation forever.
  await prisma.payment.updateMany({
    where: { appointmentId, clinicId, status: "PENDING" },
    data: { status: "FAILED", failureReason: "Superseded by a newer charge attempt" },
  });

  const payment = await prisma.payment.create({
    data: {
      clinicId,
      appointmentId,
      amount: balance,
      method: "POS_CARD",
      status: "PENDING",
      provider: clinic.posProvider,
      recordedById,
    },
  });

  try {
    const result = await provider.pushSale({ amount: balance, currency: "SAR", merchantRef: payment.id });
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        providerTxnId: result.providerTxnId,
        status: result.status,
        reference: result.reference ?? undefined,
        failureReason: result.failureReason ?? undefined,
      },
    });
    return { paymentId: payment.id, status: result.status, failureReason: result.failureReason ?? null };
  } catch (err) {
    const message = (err as Error).message;
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", failureReason: message },
    });
    throw new Error(message);
  }
}

/**
 * One poll tick: ask the acquirer what happened to a PENDING terminal charge
 * and persist the answer. Terminal states (PAID/FAILED) are returned as-is
 * without another API call, so polling a finished charge is cheap.
 */
export async function pollTerminalCharge(clinicId: string, paymentId: string) {
  const payment = await prisma.payment.findFirst({ where: { id: paymentId, clinicId } });
  if (!payment) throw new Error("Payment not found");

  if (payment.status !== "PENDING") {
    return { status: payment.status, reference: payment.reference, failureReason: payment.failureReason };
  }

  if (Date.now() - payment.createdAt.getTime() > TERMINAL_CHARGE_TIMEOUT_MS) {
    const timedOut = await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", failureReason: "Timed out waiting for the card — try again or record manually" },
    });
    return { status: timedOut.status, reference: null, failureReason: timedOut.failureReason };
  }

  const clinic = await prisma.clinic.findUniqueOrThrow({ where: { id: clinicId } });
  const provider = getPosProvider(clinic);
  const result = await provider.checkStatus(payment.providerTxnId ?? payment.id);

  if (result.status === payment.status) {
    return { status: payment.status, reference: payment.reference, failureReason: payment.failureReason };
  }
  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: result.status,
      reference: result.reference ?? undefined,
      failureReason: result.failureReason ?? undefined,
    },
  });
  return { status: updated.status, reference: updated.reference, failureReason: updated.failureReason };
}

export const updatePosSettingsSchema = z.object({
  posProvider: z.enum(["MANUAL", "GEIDEA", "NEOLEAP"]),
  posTerminalName: z.string().trim().max(100).optional(),
  posMerchantId: z.string().trim().max(200).optional(),
  posApiKey: z.string().trim().max(500).optional(),
  posApiSecret: z.string().trim().max(500).optional(),
  posTerminalId: z.string().trim().max(100).optional(),
});

/**
 * Admin-only: which POS terminal/acquirer the clinic uses plus its API
 * credentials. Key/secret follow the WhatsApp-credentials masking rule: the
 * saved values are never echoed to the browser, so an empty submission means
 * "keep what's saved" — only a non-empty value replaces it. Merchant/terminal
 * IDs aren't secret and are shown/replaced verbatim.
 */
export async function updatePosSettings(
  clinicId: string,
  input: z.infer<typeof updatePosSettingsSchema>
) {
  return prisma.clinic.update({
    where: { id: clinicId },
    data: {
      posProvider: input.posProvider,
      posTerminalName: input.posTerminalName || null,
      posMerchantId: input.posMerchantId || null,
      posTerminalId: input.posTerminalId || null,
      ...(input.posApiKey ? { posApiKey: input.posApiKey } : {}),
      ...(input.posApiSecret ? { posApiSecret: input.posApiSecret } : {}),
    },
  });
}
