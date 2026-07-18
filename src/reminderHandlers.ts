import { prisma } from "@/src/db/client";
import { createWhatsAppProvider } from "@/src/whatsapp";

export interface ReminderResult {
  total: number;
  sent: number;
  failed: number;
  errors: string[];
}

/**
 * Sends appointment reminders to patients with appointments in the next 24 hours.
 * Called by the cron endpoint or manually.
 */
export async function sendAppointmentReminders(): Promise<ReminderResult> {
  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const appointmentsToRemind = await prisma.appointment.findMany({
    where: {
      status: { in: ["CONFIRMED", "CHECKED_IN", "AT_STAGE"] },
      reminderSentAt: null,
      slot: {
        startsAt: {
          gte: now,
          lte: in24Hours,
        },
      },
    },
    include: {
      patient: true,
      slot: true,
      doctor: {
        include: {
          department: true,
        },
      },
      clinic: true,
    },
  });

  const result: ReminderResult = {
    total: appointmentsToRemind.length,
    sent: 0,
    failed: 0,
    errors: [],
  };

  for (const appointment of appointmentsToRemind) {
    try {
      const provider = createWhatsAppProvider(appointment.clinic);
      if (!provider) {
        result.errors.push(`Clinic ${appointment.clinicId} has no WhatsApp configured`);
        result.failed++;
        continue;
      }

      const appointmentTime = appointment.slot.startsAt.toLocaleString("en-US", {
        timeZone: appointment.clinic.timezone,
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
      });

      const message = appointment.patient.locale === "AR"
        ? `تذكير: لديك موعد طبي غدًا في ${appointmentTime} مع ${appointment.doctor.name} في قسم ${appointment.doctor.department.name}.`
        : `Reminder: You have a medical appointment tomorrow at ${appointmentTime} with Dr. ${appointment.doctor.name} in the ${appointment.doctor.department.name} department.`;

      await provider.sendMessage(appointment.patient.phone, message);

      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { reminderSentAt: new Date() },
      });

      result.sent++;
    } catch (error) {
      result.failed++;
      result.errors.push(
        `Failed to send reminder for appointment ${appointment.id}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  return result;
}

/**
 * Sends follow-up reminders for patients who had consultations with scheduled follow-ups.
 * Called by a separate cron job.
 */
export async function sendFollowUpReminders(): Promise<ReminderResult> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find consultations where followUpDate is today and reminder not yet sent
  const followUpsToRemind = await prisma.consultation.findMany({
    where: {
      followUpDate: today,
      followUpReminderSentAt: null,
    },
    include: {
      patient: true,
      doctor: {
        include: {
          clinic: true,
          department: true,
        },
      },
    },
  });

  const result: ReminderResult = {
    total: followUpsToRemind.length,
    sent: 0,
    failed: 0,
    errors: [],
  };

  for (const consultation of followUpsToRemind) {
    try {
      const provider = createWhatsAppProvider(consultation.doctor.clinic);
      if (!provider) {
        result.errors.push(`Clinic ${consultation.doctor.clinicId} has no WhatsApp configured`);
        result.failed++;
        continue;
      }

      const message = consultation.patient.locale === "AR"
        ? `تذكير: حان موعد متابعتك مع ${consultation.doctor.name}. يرجى تحديد موعد جديد. شكراً لاختيارنا.`
        : `Reminder: It's time for your follow-up with Dr. ${consultation.doctor.name}. Please schedule your next appointment. Thank you!`;

      await provider.sendMessage(consultation.patient.phone, message);

      await prisma.consultation.update({
        where: { id: consultation.id },
        data: { followUpReminderSentAt: new Date() },
      });

      result.sent++;
    } catch (error) {
      result.failed++;
      result.errors.push(
        `Failed to send follow-up reminder for consultation ${consultation.id}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  return result;
}
