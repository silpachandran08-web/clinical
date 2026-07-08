import { z } from "zod";
import { prisma } from "./db/client";

export const createTransactionSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  amount: z.number().positive(),
  category: z.string().optional(),
  description: z.string().optional(),
  occurredAt: z.string().min(1), // "YYYY-MM-DD" from an <input type="date">
});

export async function createTransaction(clinicId: string, input: z.infer<typeof createTransactionSchema>) {
  return prisma.transaction.create({
    data: {
      clinicId,
      type: input.type,
      amount: input.amount,
      category: input.category || undefined,
      description: input.description || undefined,
      occurredAt: new Date(input.occurredAt),
    },
  });
}

export async function listTransactions(clinicId: string, limit = 100) {
  return prisma.transaction.findMany({
    where: { clinicId },
    orderBy: { occurredAt: "desc" },
    take: limit,
  });
}

export async function deleteTransaction(clinicId: string, transactionId: string) {
  const result = await prisma.transaction.deleteMany({ where: { id: transactionId, clinicId } });
  if (result.count === 0) throw new Error("Transaction not found");
}

interface Totals {
  income: number;
  expense: number;
  net: number;
}

function summarize(rows: { type: string; _sum: { amount: unknown } }[]): Totals {
  const income = Number(rows.find((r) => r.type === "INCOME")?._sum.amount ?? 0);
  const expense = Number(rows.find((r) => r.type === "EXPENSE")?._sum.amount ?? 0);
  return { income, expense, net: income - expense };
}

export async function getFinanceSummary(clinicId: string): Promise<{ allTime: Totals; thisMonth: Totals }> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [allTime, thisMonth] = await Promise.all([
    prisma.transaction.groupBy({ by: ["type"], where: { clinicId }, _sum: { amount: true } }),
    prisma.transaction.groupBy({
      by: ["type"],
      where: { clinicId, occurredAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
  ]);

  return { allTime: summarize(allTime), thisMonth: summarize(thisMonth) };
}
