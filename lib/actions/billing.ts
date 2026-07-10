"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  recordPayment,
  recordPaymentSchema,
  updatePosSettings,
  updatePosSettingsSchema,
} from "@/src/billingHandlers";
import { getSession } from "@/lib/session";

export async function recordPaymentAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");

  const payload = recordPaymentSchema.parse({
    appointmentId: String(formData.get("appointmentId") ?? ""),
    amount: Number(formData.get("amount") ?? 0),
    method: String(formData.get("method") ?? "POS_CARD"),
    reference: String(formData.get("reference") ?? "") || undefined,
  });

  try {
    await recordPayment(session.clinicId, session.userId, payload);
  } catch (err) {
    redirect(`/receptionist?tab=billing&error=${encodeURIComponent((err as Error).message)}`);
  }

  revalidatePath("/receptionist");
  redirect("/receptionist?tab=billing&paid=1");
}

export async function savePosSettingsAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "CLINIC_ADMIN") throw new Error("Not authorized");

  const payload = updatePosSettingsSchema.parse({
    posProvider: String(formData.get("posProvider") ?? "MANUAL"),
    posTerminalName: String(formData.get("posTerminalName") ?? "") || undefined,
  });

  await updatePosSettings(session.clinicId, payload);
  revalidatePath("/admin/clinic");
  revalidatePath("/receptionist");
}
