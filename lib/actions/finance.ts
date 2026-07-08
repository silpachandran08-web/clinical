"use server";

import { revalidatePath } from "next/cache";
import { createTransaction, createTransactionSchema, deleteTransaction } from "@/src/financeHandlers";
import { getSession } from "@/lib/session";

export async function addTransactionAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");

  const payload = createTransactionSchema.parse({
    type: String(formData.get("type") ?? "INCOME"),
    amount: Number(formData.get("amount") ?? 0),
    category: String(formData.get("category") ?? ""),
    description: String(formData.get("description") ?? ""),
    occurredAt: String(formData.get("occurredAt") ?? ""),
  });

  await createTransaction(session.clinicId, payload);
  revalidatePath("/admin/finance");
}

export async function deleteTransactionAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");

  const transactionId = String(formData.get("transactionId"));
  await deleteTransaction(session.clinicId, transactionId);
  revalidatePath("/admin/finance");
}
