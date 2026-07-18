import type { Clinic } from "@prisma/client";
import { prisma } from "@/src/db/client";
import { createWhatsAppProvider } from "@/src/whatsapp";
import { bookSlot } from "@/src/scheduling/bookingService";
import { SlotUnavailableError } from "@/src/scheduling/errors";

export const WAITLIST_ACCEPT_PREFIX = "WAITLIST_ACCEPT_";
export const WAITLIST_DECLINE_PREFIX = "WAITLIST_DECLINE_";

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

/** Joins the queue for a doctor; no-op if the patient is already waiting. */
export async function addToWaitlist(clinicId: string, patientId: string, doctorId: string) {
  const existing = await prisma.waitlist.findFirst({
    where: { clinicId, patientId, doctorId, status: { in: ["WAITING", "OFFERED"] } },
  });
  if (existing) return existing;

  return prisma.waitlist.create({
    data: { clinicId, patientId, doctorId },
  });
}

/**
 * Booking realignment: after a cancellation frees a slot, offer it to the
 * oldest WAITING patient for that doctor via WhatsApp accept/decline
 * buttons. Fire-and-forget from the cancel path — a WhatsApp failure must
 * never make the cancellation itself fail.
 */
export async function offerFreedSlot(clinicId: string, slotId: string): Promise<void> {
  try {
    const slot = await prisma.slot.findFirst({
      where: { id: slotId, status: "OPEN", startsAt: { gt: new Date() } },
      include: { doctor: { include: { clinic: true } } },
    });
    if (!slot) return; // already re-taken, or in the past — nothing to offer

    const entry = await prisma.waitlist.findFirst({
      where: { clinicId, doctorId: slot.doctorId, status: "WAITING" },
      orderBy: { createdAt: "asc" },
      include: { patient: true },
    });
    if (!entry) return;

    const clinic = slot.doctor.clinic;
    const provider = createWhatsAppProvider(clinic);
    const time = formatTime(slot.startsAt, clinic.timezone);

    const message =
      entry.patient.locale === "AR"
        ? `🎉 توفر موعد!\n\nأصبح موعد ${time} متاحاً مع ${slot.doctor.name}. أنت التالي في قائمة الانتظار — هل تريد حجزه؟`
        : `🎉 A slot opened up!\n\n${time} with Dr. ${slot.doctor.name} just became available. You're next on the waitlist — would you like it?`;

    await provider.sendButtonMessage(entry.patient.phone, message, [
      {
        id: `${WAITLIST_ACCEPT_PREFIX}${entry.id}_${slot.id}`,
        title: entry.patient.locale === "AR" ? "احجزه" : "Book it",
      },
      {
        id: `${WAITLIST_DECLINE_PREFIX}${entry.id}_${slot.id}`,
        title: entry.patient.locale === "AR" ? "لا شكراً" : "No thanks",
      },
    ]);

    await prisma.waitlist.update({
      where: { id: entry.id },
      data: { status: "OFFERED", offeredSlotId: slot.id, offeredAt: new Date() },
    });
  } catch (err) {
    console.error("Failed to offer freed slot to waitlist", err);
  }
}

/**
 * Handles the patient's button reply to a waitlist offer. Returns true if
 * the buttonId belonged to a waitlist offer (handled here), false if the
 * message should fall through to the normal AI orchestrator.
 */
export async function handleWaitlistReply(
  clinic: Clinic,
  patientPhone: string,
  buttonId: string
): Promise<boolean> {
  const accepted = buttonId.startsWith(WAITLIST_ACCEPT_PREFIX);
  const declined = buttonId.startsWith(WAITLIST_DECLINE_PREFIX);
  if (!accepted && !declined) return false;

  const payload = buttonId.slice(
    accepted ? WAITLIST_ACCEPT_PREFIX.length : WAITLIST_DECLINE_PREFIX.length
  );
  const [entryId, slotId] = payload.split("_");

  const provider = createWhatsAppProvider(clinic);
  const entry = await prisma.waitlist.findFirst({
    where: { id: entryId, clinicId: clinic.id, status: "OFFERED" },
    include: { patient: true },
  });
  if (!entry || entry.offeredSlotId !== slotId) {
    // Stale button (offer expired or already resolved) — acknowledge quietly.
    await provider.sendMessage(
      patientPhone,
      clinic.defaultLocale === "AR"
        ? "عذراً، انتهت صلاحية هذا العرض."
        : "Sorry, that offer is no longer active."
    );
    return true;
  }

  if (declined) {
    await prisma.waitlist.update({ where: { id: entry.id }, data: { status: "DECLINED" } });
    await provider.sendMessage(
      patientPhone,
      entry.patient.locale === "AR"
        ? "حسناً، تمت إزالتك من قائمة الانتظار لهذا الموعد."
        : "No problem — we've noted that. You've been removed from the waitlist for this slot."
    );
    // Pass the slot down the line to the next waiting patient.
    await offerFreedSlot(clinic.id, slotId);
    return true;
  }

  try {
    const booking = await bookSlot({
      clinicId: clinic.id,
      slotId,
      patientPhone: entry.patient.phone,
      patientName: entry.patient.name ?? undefined,
      reason: "waitlist",
    });
    await prisma.waitlist.update({ where: { id: entry.id }, data: { status: "FULFILLED" } });

    const time = formatTime(booking.startsAt, clinic.timezone);
    await provider.sendMessage(
      patientPhone,
      entry.patient.locale === "AR"
        ? `✅ تم الحجز!\n\nموعدك مع ${booking.doctorName}: ${time}`
        : `✅ Booked!\n\nYour appointment with Dr. ${booking.doctorName}: ${time}`
    );
  } catch (err) {
    if (err instanceof SlotUnavailableError) {
      await prisma.waitlist.update({ where: { id: entry.id }, data: { status: "EXPIRED" } });
      await provider.sendMessage(
        patientPhone,
        entry.patient.locale === "AR"
          ? "عذراً، تم حجز هذا الموعد للتو من قبل مريض آخر."
          : "Sorry, that slot was just taken by another patient."
      );
    } else {
      throw err;
    }
  }
  return true;
}
