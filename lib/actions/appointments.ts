"use server";

import { revalidatePath } from "next/cache";
import { cancelAppointment } from "@/src/scheduling/bookingService";
import { getSession } from "@/lib/session";

export async function cancelAppointmentAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");

  const appointmentId = String(formData.get("appointmentId"));
  await cancelAppointment(session.clinicId, appointmentId);
  revalidatePath("/admin/appointments");
  revalidatePath("/admin");
}
