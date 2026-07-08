"use server";

import { revalidatePath } from "next/cache";
import { cancelAppointment } from "@/src/scheduling/bookingService";

export async function cancelAppointmentAction(formData: FormData) {
  const clinicId = String(formData.get("clinicId"));
  const appointmentId = String(formData.get("appointmentId"));
  await cancelAppointment(clinicId, appointmentId);
  revalidatePath("/admin/appointments");
  revalidatePath("/admin");
}
