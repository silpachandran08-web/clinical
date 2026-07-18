import { prisma } from "@/src/db/client";
import { createWhatsAppProvider } from "@/src/whatsapp";

function formatTime(startsAt: Date, timezone: string): string {
  return startsAt.toLocaleString("en-US", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Tells the patient their appointment moved — and, when the reschedule also
 * reassigned them (doctor handover), makes the doctor change explicit so
 * they aren't surprised at the clinic. Failures are logged, never thrown:
 * the reschedule itself already succeeded.
 */
export async function notifyAppointmentRescheduled(
  appointmentId: string,
  previousDoctorName?: string
): Promise<void> {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: true, doctor: true, slot: true, clinic: true },
    });
    if (!appointment) return;

    const provider = createWhatsAppProvider(appointment.clinic);
    const time = formatTime(appointment.slot.startsAt, appointment.clinic.timezone);
    const doctorChanged =
      previousDoctorName !== undefined && previousDoctorName !== appointment.doctor.name;

    const message =
      appointment.patient.locale === "AR"
        ? doctorChanged
          ? `🔄 تم نقل موعدك\n\nتم نقل رعايتك من ${previousDoctorName} إلى ${appointment.doctor.name}.\nموعدك الجديد: ${time}\n\nسجلك الطبي متاح لطبيبك الجديد.`
          : `🔄 تم تعديل موعدك\n\nموعدك الجديد مع ${appointment.doctor.name}: ${time}`
        : doctorChanged
          ? `🔄 Appointment Transferred\n\nYour care has been handed over from Dr. ${previousDoctorName} to Dr. ${appointment.doctor.name}.\nNew time: ${time}\n\nYour medical history is available to your new doctor.`
          : `🔄 Appointment Rescheduled\n\nYour new time with Dr. ${appointment.doctor.name}: ${time}`;

    await provider.sendMessage(appointment.patient.phone, message);
  } catch (err) {
    console.error("Failed to send reschedule notification", err);
  }
}

/**
 * Confirms a cancellation to the patient with a one-tap path back to
 * booking. Failures are logged, never thrown.
 */
export async function notifyAppointmentCancelled(appointmentId: string): Promise<void> {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: true, doctor: true, slot: true, clinic: true },
    });
    if (!appointment) return;

    const provider = createWhatsAppProvider(appointment.clinic);
    const time = formatTime(appointment.slot.startsAt, appointment.clinic.timezone);

    const message =
      appointment.patient.locale === "AR"
        ? `❌ تم إلغاء موعدك\n\nموعدك مع ${appointment.doctor.name} في ${time} تم إلغاؤه.\n\nأرسل رسالة لحجز موعد جديد.`
        : `❌ Appointment Cancelled\n\nYour appointment with Dr. ${appointment.doctor.name} at ${time} has been cancelled.\n\nMessage us anytime to book a new one.`;

    await provider.sendMessage(appointment.patient.phone, message);
  } catch (err) {
    console.error("Failed to send cancellation notification", err);
  }
}
