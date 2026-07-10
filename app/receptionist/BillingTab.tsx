import { ScaleIcon } from "../DashboardIcons";

interface BillingTabProps {
  clinic: any;
  timeZone: string;
}

export function BillingTab({ clinic, timeZone }: BillingTabProps) {
  return (
    <div style={{ maxWidth: "800px" }}>
      <div className="card">
        <h2 className="card-title-icon">
          <ScaleIcon /> Billing management
        </h2>
        <p className="muted" style={{ marginBottom: 16 }}>
          Plan and track patient billing, invoices, and payment receipts.
        </p>

        <div
          style={{
            padding: "28px 24px",
            textAlign: "center",
            background: "var(--surface-2)",
            borderRadius: "var(--radius)",
            border: "1px dashed var(--border)",
          }}
        >
          <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 500, color: "var(--text-muted)" }}>
            Billing module coming soon
          </p>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>
            Patient plans, payment tracking, and receipt generation will be available in the next release.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
        <div
          className="card"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 600, color: "var(--accent)", marginBottom: 6 }}>—</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Total outstanding</div>
          <div style={{ fontSize: 13, color: "var(--text)" }}>No data yet</div>
        </div>

        <div
          className="card"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 600, color: "var(--success)", marginBottom: 6 }}>—</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Paid this month</div>
          <div style={{ fontSize: 13, color: "var(--text)" }}>No data yet</div>
        </div>

        <div
          className="card"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 600, color: "var(--warning)", marginBottom: 6 }}>—</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Pending invoices</div>
          <div style={{ fontSize: 13, color: "var(--text)" }}>No data yet</div>
        </div>
      </div>
    </div>
  );
}
