"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  testCustomApiListDoctors,
  updateIntegrationConfig,
  updateIntegrationMode,
  updateIntegrationModeSchema,
  type IntegrationConfigFormInput,
} from "@/src/integrationHandlers";

export async function saveIntegrationModeAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "CLINIC_ADMIN") throw new Error("Not authorized");

  const payload = updateIntegrationModeSchema.parse({
    integrationMode: String(formData.get("integrationMode") ?? "NATIVE"),
  });

  await updateIntegrationMode(session.clinicId, payload.integrationMode);
  revalidatePath("/admin/clinic");
}

// Called imperatively from IntegrationSettingsForm (not as <form action>) —
// the config is nested/dynamic (per-endpoint field mappings), so the client
// builds a plain object from its own state and passes it directly, same
// pattern as the TerminalChargeButton actions in lib/actions/billing.ts.
export async function saveIntegrationConfigAction(input: IntegrationConfigFormInput) {
  const session = await getSession();
  if (!session || session.role !== "CLINIC_ADMIN") throw new Error("Not authorized");

  await updateIntegrationConfig(session.clinicId, input);
  revalidatePath("/admin/clinic");
  return { saved: true };
}

export async function testIntegrationListDoctorsAction(input: IntegrationConfigFormInput) {
  const session = await getSession();
  if (!session || session.role !== "CLINIC_ADMIN") throw new Error("Not authorized");

  try {
    const result = await testCustomApiListDoctors(session.clinicId, input);
    return { ...result, error: null as string | null };
  } catch (err) {
    return { raw: null, mapped: null, error: err instanceof Error ? err.message : "Test connection failed" };
  }
}
