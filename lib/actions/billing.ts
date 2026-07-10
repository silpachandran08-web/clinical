"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  pollTerminalCharge,
  recordPayment,
  recordPaymentSchema,
  startTerminalCharge,
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
    posMerchantId: String(formData.get("posMerchantId") ?? "") || undefined,
    posApiKey: String(formData.get("posApiKey") ?? "") || undefined,
    posApiSecret: String(formData.get("posApiSecret") ?? "") || undefined,
    posTerminalId: String(formData.get("posTerminalId") ?? "") || undefined,
  });

  await updatePosSettings(session.clinicId, payload);
  revalidatePath("/admin/clinic");
  revalidatePath("/receptionist");
}

// The two actions below are called imperatively from the Billing tab's
// TerminalChargeButton (not as <form action>), so they return plain objects
// instead of redirecting.

export async function startTerminalChargeAction(appointmentId: string) {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" as string, paymentId: null, status: null };

  try {
    const result = await startTerminalCharge(session.clinicId, session.userId, appointmentId);
    return { error: null, paymentId: result.paymentId, status: result.status };
  } catch (err) {
    return { error: (err as Error).message, paymentId: null, status: null };
  }
}

export async function pollTerminalChargeAction(paymentId: string) {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" as string, status: null, failureReason: null };

  try {
    const result = await pollTerminalCharge(session.clinicId, paymentId);
    if (result.status === "PAID") revalidatePath("/receptionist");
    return { error: null, status: result.status, failureReason: result.failureReason };
  } catch (err) {
    return { error: (err as Error).message, status: null, failureReason: null };
  }
}
