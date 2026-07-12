"use server";

import { revalidatePath } from "next/cache";
import { saveFlowSteps } from "@/src/adminHandlers";
import { getSession } from "@/lib/session";

/** Replaces a department's whole flow sequence at once — see FlowEditor.tsx, which serializes the ordered stage IDs as a hidden JSON field rather than relying on FormData's repeated-field ordering. */
export async function saveFlowAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");

  const ownerDepartmentId = String(formData.get("ownerDepartmentId") ?? "");
  const stageOrder = String(formData.get("stageOrder") ?? "[]");
  const stageDepartmentIds: string[] = JSON.parse(stageOrder);

  await saveFlowSteps(session.clinicId, ownerDepartmentId, stageDepartmentIds);

  revalidatePath("/admin/flow");
}
