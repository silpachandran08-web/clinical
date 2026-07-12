import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getClinic } from "@/src/adminHandlers";
import { getMyDepartmentId, listStageQueue } from "@/src/doctorHandlers";
import { AutoRefresh } from "../AutoRefresh";
import { ClockIcon, StethoscopeIcon } from "../DashboardIcons";

export default async function NursePage() {
  const session = await getSession();
  if (!session || session.role !== "NURSE" || !session.doctorId) redirect("/login");

  const clinic = await getClinic(session.clinicId);
  const myDepartmentId = await getMyDepartmentId(session.clinicId, session.doctorId);
  const stageQueue = await listStageQueue(session.clinicId, myDepartmentId, clinic.timezone);

  return (
    <div>
      <AutoRefresh />
      <div className="page-header">
        <h1>Nurse queue</h1>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card-icon"><ClockIcon /></div>
          <div className="stat-value">{stageQueue.length}</div>
          <div className="stat-label">Waiting</div>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title-icon" style={{ marginBottom: 2 }}>
          <StethoscopeIcon /> Stage queue
        </h2>
        <p className="muted" style={{ marginTop: 0, marginBottom: 14, fontSize: 12.5 }}>
          Shared — any staff in your department can pick these up. Tap a patient to record vitals.
        </p>

        {stageQueue.length === 0 ? (
          <p className="empty-state">No one waiting at this stage.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {stageQueue.map((a) => (
              <Link
                key={a.id}
                href={`/nurse/${a.id}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  padding: 16,
                  background: "var(--surface-2)",
                  borderRadius: "var(--radius-sm)",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <strong>{a.patient.name ?? a.patient.phone}</strong>
                <span className="muted" style={{ fontSize: 12.5 }}>
                  {a.slot.startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: clinic.timezone })}
                  {" · for "}
                  {a.doctor.name}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
