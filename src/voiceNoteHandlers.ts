import type { Clinic } from "@prisma/client";
import { prisma } from "@/src/db/client";
import { createWhatsAppProvider } from "@/src/whatsapp";
import type { InboundWhatsAppMessage } from "@/src/whatsapp";

/**
 * Stores an inbound WhatsApp voice note and acknowledges it, so a patient
 * describing symptoms by voice isn't silently dropped by the text-only AI.
 * The note lands in the patient's conversation history (visible to staff)
 * and as a VoiceNote row keyed by the provider media id; a staff escalation
 * makes sure a human actually listens to it.
 */
export async function handleInboundVoiceNote(
  clinic: Clinic,
  message: InboundWhatsAppMessage
): Promise<void> {
  const patient = await prisma.patient.findUnique({
    where: { clinicId_phone: { clinicId: clinic.id, phone: message.fromPhone } },
  });

  await prisma.voiceNote.create({
    data: {
      clinicId: clinic.id,
      patientId: patient?.id ?? null,
      patientPhone: message.fromPhone,
      providerMediaId: message.mediaId!,
      mimeType: message.mimeType,
    },
  });

  // Keep the conversation transcript complete for staff reviewing the chat.
  const conversation = await prisma.conversation.findFirst({
    where: { clinicId: clinic.id, patientPhone: message.fromPhone },
    orderBy: { lastMessageAt: "desc" },
  });
  if (conversation) {
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: "INBOUND",
        body: "[voice note]",
      },
    });
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });
  }

  // The AI can't hear audio, so route it to a human — same queue the AI
  // already uses for anything it can't handle safely.
  await prisma.staffEscalation.create({
    data: {
      clinicId: clinic.id,
      patientPhone: message.fromPhone,
      reason: "Patient sent a voice note — please listen and respond",
    },
  });

  const provider = createWhatsAppProvider(clinic);
  await provider.sendMessage(
    message.fromPhone,
    clinic.defaultLocale === "AR"
      ? "🎤 استلمنا رسالتك الصوتية وسيستمع إليها فريقنا ويرد عليك قريباً. يمكنك أيضاً كتابة طلبك نصياً للحصول على رد فوري."
      : "🎤 We received your voice note — our staff will listen and get back to you shortly. You can also type your request for an instant reply."
  );
}

/** Recent voice notes for a clinic's staff view, newest first. */
export async function listVoiceNotes(clinicId: string, limit = 20) {
  return prisma.voiceNote.findMany({
    where: { clinicId },
    include: { patient: { select: { name: true, phone: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
