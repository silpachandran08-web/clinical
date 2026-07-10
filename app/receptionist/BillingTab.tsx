import { ScaleIcon } from "../DashboardIcons";
import { recordPaymentAction } from "@/lib/actions/billing";
import { TerminalChargeButton } from "./TerminalChargeButton";

interface BillingRow {
  appointmentId: string;
  startsAt: Date;
  appointmentStatus: string;
  patientName: string | null;
  patientPhone: string;
  doctorName: string;
  consultationFee: number;
  charges: Array<{ description: string; amount: number }>;
  total: number;
  paid: number;
  balance: number;
  payments: Array<{
    id: string;
    amount: number;
    method: string;
    reference: string | null;
    createdAt: Date;
  }>;
}

interface BillingTabProps {
  rows: BillingRow[];
  collectedToday: number;
  collectedThisMonth: number;
  posTerminalName: string | null;
  /** True when the clinic picked Geidea/Neoleap AND entered its API credentials. */
  posConnected: boolean;
  posProviderLabel: string | null;
  timeZone: string;
  error?: string;
  paid?: boolean;
}

function money(n: number) {
  return `SAR ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Cash / keyed-in POS payment — the only path when no terminal API is connected, the fallback when one is. */
function ManualCollectForm({ row }: { row: BillingRow }) {
  return (
    <form
      action={recordPaymentAction}
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "flex-end",
        gap: 10,
        marginTop: 8,
      }}
    >
      <input type="hidden" name="appointmentId" value={row.appointmentId} />
      <label style={{ fontSize: 12 }}>
        Amount (SAR)
        <input
          type="number"
          name="amount"
          min="0.01"
          max={row.balance}
          step="0.01"
          defaultValue={row.balance}
          required
          style={{ width: 110 }}
        />
      </label>
      <label style={{ fontSize: 12 }}>
        Method
        <select name="method" defaultValue="POS_CARD">
          <option value="POS_CARD">Card — POS terminal</option>
          <option value="CASH">Cash</option>
        </select>
      </label>
      <label style={{ fontSize: 12, flex: 1, minWidth: 160 }}>
        POS approval code (optional)
        <input name="reference" placeholder="e.g. 048291" />
      </label>
      <button type="submit">Collect</button>
    </form>
  );
}

export function BillingTab({
  rows,
  collectedToday,
  collectedThisMonth,
  posTerminalName,
  posConnected,
  posProviderLabel,
  timeZone,
  error,
  paid,
}: BillingTabProps) {
  const outstandingToday = Math.round(rows.reduce((sum, r) => sum + r.balance, 0) * 100) / 100;
  const terminalLabel = posTerminalName || "the clinic's POS terminal";

  return (
    <div>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">{money(collectedToday)}</div>
          <div className="stat-label">Collected today</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{money(outstandingToday)}</div>
          <div className="stat-label">Outstanding today</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{money(collectedThisMonth)}</div>
          <div className="stat-label">Collected this month</div>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {paid && !error && (
        <p style={{ color: "var(--success)", fontSize: 13, fontWeight: 500 }}>Payment recorded.</p>
      )}

      <div className="card">
        <h2 className="card-title-icon">
          <ScaleIcon /> Today&apos;s visits
        </h2>
        <p className="muted" style={{ marginBottom: 16 }}>
          {posConnected ? (
            <>
              Connected to {posProviderLabel} — the Charge button sends the amount straight to{" "}
              {terminalLabel}; once the patient taps their card, the visit is marked paid
              automatically. Cash and manual entries are still available under each visit.
            </>
          ) : (
            <>
              Card payments are charged on {terminalLabel} as usual — record the result here with
              the approval code from the terminal slip, so the visit is marked paid.
            </>
          )}
        </p>

        {rows.length === 0 ? (
          <p className="empty-state">No appointments today.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {rows.map((row) => (
              <div
                key={row.appointmentId}
                style={{
                  border: "1px solid var(--border-soft)",
                  borderRadius: "var(--radius)",
                  padding: "14px 16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <div style={{ fontSize: 13 }}>
                    <strong>
                      {row.startsAt.toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone,
                      })}
                    </strong>{" "}
                    · {row.patientName ?? row.patientPhone} · {row.doctorName}
                  </div>
                  <span
                    className={`badge ${row.balance <= 0 ? "success" : row.paid > 0 ? "warning" : "danger"}`}
                  >
                    {row.balance <= 0 ? "Paid" : row.paid > 0 ? "Partially paid" : "Unpaid"}
                  </span>
                </div>

                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
                  Consultation {money(row.consultationFee)}
                  {row.charges.map((c, i) => (
                    <span key={i}>
                      {" "}
                      · {c.description} {money(c.amount)}
                    </span>
                  ))}
                  {" — "}
                  <strong style={{ color: "var(--text)" }}>Total {money(row.total)}</strong>
                  {row.paid > 0 && <> · Paid {money(row.paid)}</>}
                  {row.balance > 0 && row.paid > 0 && <> · Due {money(row.balance)}</>}
                </div>

                {row.payments.length > 0 && (
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                    {row.payments.map((p) => (
                      <div key={p.id}>
                        {p.method === "POS_CARD" ? "Card (POS)" : "Cash"} · {money(p.amount)}
                        {p.reference ? ` · ref ${p.reference}` : ""} ·{" "}
                        {p.createdAt.toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone,
                        })}
                      </div>
                    ))}
                  </div>
                )}

                {row.balance > 0 && (
                  <div style={{ marginTop: 12 }}>
                    {posConnected && (
                      <TerminalChargeButton
                        appointmentId={row.appointmentId}
                        amountLabel={money(row.balance)}
                        terminalLabel={terminalLabel}
                      />
                    )}

                    {posConnected ? (
                      <details style={{ marginTop: 8 }}>
                        <summary className="muted" style={{ fontSize: 12, cursor: "pointer" }}>
                          Record cash / manual payment instead
                        </summary>
                        <ManualCollectForm row={row} />
                      </details>
                    ) : (
                      <ManualCollectForm row={row} />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
