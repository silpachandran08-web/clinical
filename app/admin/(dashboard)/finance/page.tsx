import { redirect } from "next/navigation";
import { getFinanceSummary, listTransactions } from "@/src/financeHandlers";
import { addTransactionAction, deleteTransactionAction } from "@/lib/actions/finance";
import { getSession } from "@/lib/session";

function money(n: number) {
  return `SAR ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function FinancePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [summary, transactions] = await Promise.all([
    getFinanceSummary(session.clinicId),
    listTransactions(session.clinicId),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <h1>Finance</h1>
      <p className="muted">
        Manual bookkeeping for now — log what came in and what went out by hand. This becomes
        automatic once payment collection is wired up.
      </p>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">{money(summary.thisMonth.income)}</div>
          <div className="stat-label">Income this month</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{money(summary.thisMonth.expense)}</div>
          <div className="stat-label">Expenses this month</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{money(summary.thisMonth.net)}</div>
          <div className="stat-label">Net this month</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{money(summary.allTime.net)}</div>
          <div className="stat-label">Net all-time</div>
        </div>
      </div>

      <div className="card">
        <h2>Log a transaction</h2>
        <form action={addTransactionAction} className="stack">
          <label>
            Type
            <select name="type" defaultValue="INCOME" required>
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expense</option>
            </select>
          </label>
          <label>
            Amount (SAR)
            <input type="number" name="amount" min="0.01" step="0.01" required />
          </label>
          <label>
            Date
            <input type="date" name="occurredAt" defaultValue={today} required />
          </label>
          <label>
            Category (optional)
            <input name="category" placeholder="e.g. Consultation fee, Supplies, Rent" />
          </label>
          <label>
            Description (optional)
            <input name="description" placeholder="Any extra detail" />
          </label>
          <button type="submit">Add transaction</button>
        </form>
      </div>

      <div className="card">
        <h2>Recent transactions</h2>
        {transactions.length === 0 ? (
          <p className="empty-state">No transactions logged yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Category</th>
                <th>Description</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id}>
                  <td>{t.occurredAt.toLocaleDateString()}</td>
                  <td>
                    <span className={`badge ${t.type === "INCOME" ? "success" : "danger"}`}>{t.type}</span>
                  </td>
                  <td>{money(Number(t.amount))}</td>
                  <td>{t.category ?? "—"}</td>
                  <td>{t.description ?? "—"}</td>
                  <td>
                    <form action={deleteTransactionAction}>
                      <input type="hidden" name="transactionId" value={t.id} />
                      <button type="submit" className="danger">
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
