import { prisma } from "@/src/db/client";
import { createWhatsAppProvider } from "@/src/whatsapp";
import { sendQueueUpdate } from "@/src/whatsapp/messageTemplates";
import type { Clinic } from "@prisma/client";

/**
 * Get patient's current position in queue and other details.
 */
export async function getQueuePosition(appointmentId: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: true,
      doctor: {
        include: {
          department: true,
        },
      },
      currentDepartment: true,
      clinic: true,
      slot: true,
    },
  });

  if (!appointment) return null;

  // If not checked in, not in queue yet
  if (appointment.status === "CONFIRMED") {
    return { position: null, message: "Not checked in yet" };
  }

  // Count appointments ahead in the same department (or ahead for doctor if no stage dept)
  const targetDepartmentId =
    appointment.status === "AT_STAGE" ? appointment.currentDepartmentId : null;

  let appointmentsAhead: number;
  if (targetDepartmentId) {
    // Queue at a stage department
    appointmentsAhead = await prisma.appointment.count({
      where: {
        clinicId: appointment.clinicId,
        currentDepartmentId: targetDepartmentId,
        status: { in: ["AT_STAGE", "CHECKED_IN"] },
        slot: {
          startsAt: { lt: appointment.slot.startsAt },
        },
      },
    });
  } else {
    // Queue at doctor
    appointmentsAhead = await prisma.appointment.count({
      where: {
        doctorId: appointment.doctorId,
        status: { in: ["CHECKED_IN", "IN_PROGRESS"] },
        slot: {
          startsAt: { lt: appointment.slot.startsAt },
        },
      },
    });
  }

  const position = appointmentsAhead + 1;

  // Estimate wait time: ~15 min per patient ahead
  const estimatedMinutes = appointmentsAhead * 15;

  return {
    position,
    estimatedMinutes,
    appointmentId,
    patientName: appointment.patient.name,
    clinic: appointment.clinic,
  };
}

/**
 * Send queue position update to patient via WhatsApp.
 */
export async function sendQueuePositionUpdate(appointmentId: string): Promise<void> {
  const queueInfo = await getQueuePosition(appointmentId);
  if (!queueInfo || queueInfo.position === null) return;

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: true,
      clinic: true,
    },
  });

  if (!appointment) return;

  const provider = createWhatsAppProvider(appointment.clinic);
  await sendQueueUpdate(
    provider,
    appointment.patient.phone,
    queueInfo.position,
    queueInfo.estimatedMinutes,
    appointment.clinic,
    appointment.patient.locale
  );
}

/**
 * Send "you're next" notification when patient is almost due.
 * Typically called 5 minutes before slot start time.
 */
export async function sendYoureNextNotification(appointmentId: string): Promise<void> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: true,
      doctor: {
        include: {
          department: true,
        },
      },
      clinic: true,
      slot: true,
    },
  });

  if (!appointment) return;

  const provider = createWhatsAppProvider(appointment.clinic);
  const message = appointment.patient.locale === "AR"
    ? `🔔 أنت التالي!\n\nاستعد لرؤية ${appointment.doctor.name} في قسم ${appointment.doctor.department.name}`
    : `🔔 You're Next!\n\nPrepare to see Dr. ${appointment.doctor.name} in ${appointment.doctor.department.name}`;

  await provider.sendMessage(appointment.patient.phone, message);
}

/**
 * Send "finished at stage" notification to move to next stage.
 */
export async function sendStageCompletedNotification(appointmentId: string, nextStageOrDoctor: string): Promise<void> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: true,
      clinic: true,
    },
  });

  if (!appointment) return;

  const provider = createWhatsAppProvider(appointment.clinic);
  const message = appointment.patient.locale === "AR"
    ? `✅ تم إكمال المرحلة\n\nيرجى التوجه إلى: ${nextStageOrDoctor}`
    : `✅ Stage Complete\n\nPlease proceed to: ${nextStageOrDoctor}`;

  await provider.sendMessage(appointment.patient.phone, message);
}

/**
 * Send queue update to all patients in a department when someone advances.
 * Called when an appointment moves from AT_STAGE to CHECKED_IN or IN_PROGRESS.
 */
export async function broadcastQueueUpdate(departmentId: string, clinic: Clinic): Promise<void> {
  const appointmentsInQueue = await prisma.appointment.findMany({
    where: {
      clinicId: clinic.id,
      currentDepartmentId: departmentId,
      status: "AT_STAGE",
    },
    include: {
      patient: true,
      slot: true,
    },
  });

  for (const appointment of appointmentsInQueue) {
    await sendQueuePositionUpdate(appointment.id);
  }
}

/**
 * Cancel queue notifications for an appointment.
 */
export async function cancelQueueNotifications(appointmentId: string): Promise<void> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: true,
      clinic: true,
    },
  });

  if (!appointment) return;

  const provider = createWhatsAppProvider(appointment.clinic);
  const message = appointment.patient.locale === "AR"
    ? "❌ تم إلغاء الموعد. إذا احتجت إلى موعد آخر، يرجى الاتصال بنا."
    : "❌ Your appointment has been cancelled. Please contact us if you need to reschedule.";

  await provider.sendMessage(appointment.patient.phone, message);
}
