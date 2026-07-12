"use server";

import { revalidatePath } from "next/cache";
import { recordLabResultAndAdvance } from "@/src/labHandlers";
import { getSession } from "@/lib/session";

const FIELD_PREFIX = "field_";

function requireLabSession() {
  return getSession().then((session) => {
    if (!session || session.role !== "LAB" || !session.doctorId) {
      throw new Error("Not authenticated as lab staff");
    }
    return session as typeof session & { doctorId: string };
  });
}

export async function recordLabResultAndAdvanceAction(formData: FormData) {
  const session = await requireLabSession();
  const appointmentId = String(formData.get("appointmentId"));

  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith(FIELD_PREFIX) && typeof value === "string") {
      values[key.slice(FIELD_PREFIX.length)] = value;
    }
  }

  await recordLabResultAndAdvance(session.clinicId, session.doctorId, appointmentId, values);
  revalidatePath("/lab");
  revalidatePath("/doctor");
  revalidatePath("/receptionist");
}
