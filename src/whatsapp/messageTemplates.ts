import type { Clinic } from "@prisma/client";
import type { WhatsAppProvider, WhatsAppButton, WhatsAppListItem } from "./provider";

/**
 * Button-driven WhatsApp message templates for common patient interactions.
 * Separate from orchestrator so they can be reused across different flows.
 */

export async function sendBookingConfirmation(
  provider: WhatsAppProvider,
  toPhone: string,
  patientName: string,
  doctorName: string,
  appointmentTime: string,
  appointmentId: string,
  locale: string
): Promise<void> {
  const message = locale === "AR"
    ? `✅ تم تأكيد موعدك\n\nالمريض: ${patientName}\nالطبيب: ${doctorName}\nالموعد: ${appointmentTime}`
    : `✅ Appointment Confirmed\n\nPatient: ${patientName}\nDoctor: ${doctorName}\nTime: ${appointmentTime}`;

  const buttons: WhatsAppButton[] = [
    {
      id: `RESCHEDULE_${appointmentId}`,
      title: locale === "AR" ? "إعادة جدولة" : "Reschedule",
    },
    {
      id: `CANCEL_${appointmentId}`,
      title: locale === "AR" ? "إلغاء" : "Cancel",
    },
  ];

  await provider.sendButtonMessage(toPhone, message, buttons);
}

export async function sendRescheduleDatePicker(
  provider: WhatsAppProvider,
  toPhone: string,
  appointmentId: string,
  availableDates: Array<{ date: string; id: string }>,
  locale: string
): Promise<void> {
  const message = locale === "AR"
    ? "متى تريد إعادة جدولة موعدك؟"
    : "When would you like to reschedule?";

  const items: WhatsAppListItem[] = availableDates.map((d) => ({
    id: `DATE_${appointmentId}_${d.id}`,
    title: d.date,
  }));

  await provider.sendListMessage(
    toPhone,
    message,
    items,
    locale === "AR" ? "اختر" : "Choose"
  );
}

export async function sendCancellationConfirmation(
  provider: WhatsAppProvider,
  toPhone: string,
  doctorName: string,
  appointmentTime: string,
  locale: string
): Promise<void> {
  const message = locale === "AR"
    ? `❌ تم إلغاء الموعد\n\nكان لديك موعد مع ${doctorName} في ${appointmentTime}\n\nإذا كنت بحاجة إلى موعد آخر، يرجى التواصل معنا.`
    : `❌ Appointment Cancelled\n\nYou had an appointment with Dr. ${doctorName} at ${appointmentTime}\n\nIf you need another appointment, please contact us.`;

  const buttons: WhatsAppButton[] = [
    {
      id: "BOOK_NEW",
      title: locale === "AR" ? "حجز جديد" : "Book New",
    },
    {
      id: "CONTACT_CLINIC",
      title: locale === "AR" ? "اتصل بنا" : "Contact",
    },
  ];

  await provider.sendButtonMessage(toPhone, message, buttons);
}

export async function sendLabResultsReady(
  provider: WhatsAppProvider,
  toPhone: string,
  patientName: string,
  testType: string,
  locale: string
): Promise<void> {
  const message = locale === "AR"
    ? `🔬 نتائج الاختبار جاهزة\n\n${patientName}، نتائج ${testType} الخاصة بك جاهزة الآن.`
    : `🔬 Lab Results Ready\n\n${patientName}, your ${testType} results are ready now.`;

  const buttons: WhatsAppButton[] = [
    {
      id: "VIEW_RESULTS",
      title: locale === "AR" ? "عرض النتائج" : "View Results",
    },
    {
      id: "BOOK_FOLLOWUP",
      title: locale === "AR" ? "حجز متابعة" : "Book Follow-up",
    },
  ];

  await provider.sendButtonMessage(toPhone, message, buttons);
}

export async function sendPrescriptionReady(
  provider: WhatsAppProvider,
  toPhone: string,
  patientName: string,
  locale: string
): Promise<void> {
  const message = locale === "AR"
    ? `💊 وصفة طبية جديدة\n\n${patientName}، لديك وصفة طبية جديدة من طبيبك.`
    : `💊 New Prescription\n\n${patientName}, you have a new prescription from your doctor.`;

  const buttons: WhatsAppButton[] = [
    {
      id: "VIEW_PRESCRIPTION",
      title: locale === "AR" ? "عرض الوصفة" : "View Rx",
    },
    {
      id: "REQUEST_REFILL",
      title: locale === "AR" ? "طلب إعادة ملء" : "Request Refill",
    },
  ];

  await provider.sendButtonMessage(toPhone, message, buttons);
}

export async function sendQueueUpdate(
  provider: WhatsAppProvider,
  toPhone: string,
  position: number,
  estimatedMinutes: number,
  clinic: Clinic,
  locale: string
): Promise<void> {
  const message = clinic.defaultLocale === "AR" && locale === "AR"
    ? `📍 تحديث الطابور\n\nأنت في المركز ${position} في الطابور\nالوقت المتوقع: ${estimatedMinutes} دقيقة`
    : `📍 Queue Update\n\nYou are at position #${position} in queue\nEstimated wait: ${estimatedMinutes} minutes`;

  await provider.sendMessage(toPhone, message);
}

export async function sendFollowUpRequest(
  provider: WhatsAppProvider,
  toPhone: string,
  doctorName: string,
  locale: string
): Promise<void> {
  const message = locale === "AR"
    ? `🏥 موعد المتابعة\n\nأوصى ${doctorName} بموعد متابعة. هل تريد حجز موعد الآن؟`
    : `🏥 Follow-up Needed\n\nDr. ${doctorName} recommends a follow-up. Would you like to book now?`;

  const buttons: WhatsAppButton[] = [
    {
      id: "BOOK_FOLLOWUP",
      title: locale === "AR" ? "احجز الآن" : "Book Now",
    },
    {
      id: "LATER",
      title: locale === "AR" ? "لاحقاً" : "Later",
    },
  ];

  await provider.sendButtonMessage(toPhone, message, buttons);
}
