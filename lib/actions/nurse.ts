"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { recordVitalsAndAdvance, recordVitalsSchema } from "@/src/nurseHandlers";
import { getSession } from "@/lib/session";

function requireNurseSession() {
  return getSession().then((session) => {
    if (!session || session.role !== "NURSE" || !session.doctorId) {
      throw new Error("Not authenticated as a nurse");
    }
    return session as typeof session & { doctorId: string };
  });
}

export async function recordVitalsAndAdvanceAction(formData: FormData) {
  const session = await requireNurseSession();
  const appointmentId = String(formData.get("appointmentId"));

  const payload = recordVitalsSchema.parse({
    bloodPressure: String(formData.get("bloodPressure") ?? ""),
    heightCm: String(formData.get("heightCm") ?? ""),
    weightKg: String(formData.get("weightKg") ?? ""),
    temperatureC: String(formData.get("temperatureC") ?? "") || undefined,
    pulseBpm: String(formData.get("pulseBpm") ?? "") || undefined,
    notes: String(formData.get("notes") ?? "") || undefined,
  });

  await recordVitalsAndAdvance(session.clinicId, session.doctorId, appointmentId, payload);
  revalidatePath("/nurse");
  revalidatePath("/doctor");
  revalidatePath("/receptionist");
  redirect("/nurse");
}
