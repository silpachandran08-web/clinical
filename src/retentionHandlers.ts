import { prisma } from "@/src/db/client";
import { createWhatsAppProvider } from "@/src/whatsapp";
import type { ReminderResult } from "@/src/reminderHandlers";

const INACTIVE_AFTER_DAYS = 90; // no visit in this long = "inactive"
const RE_ENGAGE_COOLDOWN_DAYS = 90; // never nudge the same patient more often than this

/**
 * Patients whose last completed visit is older than the cutoff, with no
 * upcoming appointment — the retention cron messages these (rate-limited
 * by Patient.lastReEngagedAt). Also usable directly for a dashboard list.
 */
export async function findInactivePatients(clinicId: string, inactiveAfterDays = INACTIVE_AFTER_DAYS) {
  const cutoff = new Date(Date.now() - inactiveAfterDays * 24 * 60 * 60 * 1000);

  return prisma.patient.findMany({
    where: {
      clinicId,
      // Had at least one real visit — pure no-shows are handled separately.
      appointments: { some: { status: "COMPLETED" } },
      // ...but none recently, and nothing booked ahead.
      AND: [
        { appointments: { none: { status: "COMPLETED", slot: { startsAt: { gte: cutoff } } } } },
        { appointments: { none: { status: { in: ["CONFIRMED", "CHECKED_IN"] } } } },
      ],
    },
    take: 200,
  });
}

/**
 * Re-engagement pass: one friendly "we miss you" WhatsApp message per
 * inactive patient, at most once per cooldown window. Run daily via
 * /api/cron/retention.
 */
export async function sendReEngagementMessages(): Promise<ReminderResult> {
  const result: ReminderResult = { total: 0, sent: 0, failed: 0, errors: [] };
  const cooldownCutoff = new Date(Date.now() - RE_ENGAGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);

  const clinics = await prisma.clinic.findMany({ where: { whatsappNumber: { not: null } } });

  for (const clinic of clinics) {
    const inactive = await findInactivePatients(clinic.id);
    const due = inactive.filter((p) => !p.lastReEngagedAt || p.lastReEngagedAt < cooldownCutoff);
    result.total += due.length;

    const provider = createWhatsAppProvider(clinic);
    for (const patient of due) {
      try {
        const message =
          patient.locale === "AR"
            ? `👋 ${patient.name ?? ""} نفتقدك في ${clinic.name}!\n\nمر وقت منذ زيارتك الأخيرة. هل تريد حجز موعد فحص؟ فقط أرسل لنا رسالة.`
            : `👋 ${patient.name ?? "Hi"}, we miss you at ${clinic.name}!\n\nIt's been a while since your last visit. Want to book a check-up? Just message us here.`;

        await provider.sendMessage(patient.phone, message);
        await prisma.patient.update({
          where: { id: patient.id },
          data: { lastReEngagedAt: new Date() },
        });
        result.sent++;
      } catch (err) {
        result.failed++;
        result.errors.push(
          `Re-engagement failed for patient ${patient.id}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  }

  return result;
}

/**
 * "Sorry we missed you" follow-up for yesterday's NO_SHOW appointments —
 * the single highest-leverage retention message a clinic can send. Sent
 * once per appointment (noShowFollowUpSentAt guard).
 */
export async function sendNoShowFollowUps(): Promise<ReminderResult> {
  const result: ReminderResult = { total: 0, sent: 0, failed: 0, errors: [] };
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const noShows = await prisma.appointment.findMany({
    where: {
      status: "NO_SHOW",
      noShowFollowUpSentAt: null,
      slot: { startsAt: { gte: since, lt: new Date() } },
    },
    include: { patient: true, doctor: true, clinic: true },
  });
  result.total = noShows.length;

  for (const appointment of noShows) {
    try {
      const provider = createWhatsAppProvider(appointment.clinic);
      const message =
        appointment.patient.locale === "AR"
          ? `نأسف لأننا افتقدناك في موعدك مع ${appointment.doctor.name}. نتمنى أن يكون كل شيء على ما يرام — أرسل لنا رسالة لإعادة الحجز في أي وقت.`
          : `Sorry we missed you at your appointment with Dr. ${appointment.doctor.name}. We hope everything is okay — message us anytime to rebook.`;

      await provider.sendMessage(appointment.patient.phone, message);
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { noShowFollowUpSentAt: new Date() },
      });
      result.sent++;
    } catch (err) {
      result.failed++;
      result.errors.push(
        `No-show follow-up failed for appointment ${appointment.id}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return result;
}

/**
 * Lead management: conversations from phone numbers that never became a
 * booked patient — people who asked about the clinic but didn't book.
 * Surfaced for the front desk to follow up manually.
 */
export async function findOpenLeads(clinicId: string, limit = 50) {
  const conversations = await prisma.conversation.findMany({
    where: { clinicId },
    orderBy: { lastMessageAt: "desc" },
    take: 500,
    select: { patientPhone: true, lastMessageAt: true, patientId: true },
  });

  const leads: Array<{ phone: string; lastMessageAt: Date }> = [];
  const seen = new Set<string>();
  for (const c of conversations) {
    if (seen.has(c.patientPhone)) continue;
    seen.add(c.patientPhone);

    const hasBooking = await prisma.appointment.findFirst({
      where: { clinicId, patient: { phone: c.patientPhone } },
      select: { id: true },
    });
    if (!hasBooking) {
      leads.push({ phone: c.patientPhone, lastMessageAt: c.lastMessageAt });
      if (leads.length >= limit) break;
    }
  }
  return leads;
}
