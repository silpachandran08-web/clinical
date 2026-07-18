"use server";

import { revalidatePath } from "next/cache";
import { cancelAppointment } from "@/src/scheduling/bookingService";
import { getSession } from "@/lib/session";
import { notifyAppointmentCancelled } from "@/src/appointmentNotifications";
import { offerFreedSlot } from "@/src/waitlistHandlers";
import { logAuditSafe } from "@/src/auditLog";

export async function cancelAppointmentAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");

  const appointmentId = String(formData.get("appointmentId"));
  const { freedSlotId } = await cancelAppointment(session.clinicId, appointmentId);
  await notifyAppointmentCancelled(appointmentId);
  await offerFreedSlot(session.clinicId, freedSlotId);
  await logAuditSafe({
    clinicId: session.clinicId,
    userId: session.userId,
    action: "appointment.cancel",
    entity: "Appointment",
    entityId: appointmentId,
  });
  revalidatePath("/admin/appointments");
  revalidatePath("/admin");
}
