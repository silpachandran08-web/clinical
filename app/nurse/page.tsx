import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getClinic } from "@/src/adminHandlers";
import { getMyDepartmentId, listStageQueue } from "@/src/doctorHandlers";
import { recordVitalsAndAdvanceAction } from "@/lib/actions/nurse";
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
          Shared — any staff in your department can pick these up. Vitals are required before sending a patient on.
        </p>

        {stageQueue.length === 0 ? (
          <p className="empty-state">No one waiting at this stage.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {stageQueue.map((a) => (
              <div key={a.id} style={{ padding: 16, background: "var(--surface-2)", borderRadius: "var(--radius-sm)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                  <strong>{a.patient.name ?? a.patient.phone}</strong>
                  <span className="muted" style={{ fontSize: 12.5 }}>
                    {a.slot.startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: clinic.timezone })}
                    {" · for "}
                    {a.doctor.name}
                  </span>
                </div>
                <form action={recordVitalsAndAdvanceAction} className="stack" style={{ maxWidth: 480 }}>
                  <input type="hidden" name="appointmentId" value={a.id} />
                  <div style={{ display: "flex", gap: 12 }}>
                    <label style={{ flex: 1 }}>
                      Blood pressure
                      <input name="bloodPressure" placeholder="120/80" required />
                    </label>
                    <label style={{ flex: 1 }}>
                      Height (cm)
                      <input name="heightCm" type="number" step="0.1" min="0.1" required />
                    </label>
                    <label style={{ flex: 1 }}>
                      Weight (kg)
                      <input name="weightKg" type="number" step="0.1" min="0.1" required />
                    </label>
                  </div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <label style={{ flex: 1 }}>
                      Temperature (°C)
                      <input name="temperatureC" type="number" step="0.1" />
                    </label>
                    <label style={{ flex: 1 }}>
                      Pulse (bpm)
                      <input name="pulseBpm" type="number" step="1" min="1" />
                    </label>
                  </div>
                  <label>
                    Notes
                    <textarea name="notes" rows={2} />
                  </label>
                  <button type="submit">Save vitals &amp; send to next stage →</button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
