import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getClinic, listLabFieldDefinitions } from "@/src/adminHandlers";
import { getMyDepartmentId, listStageQueue } from "@/src/doctorHandlers";
import { recordLabResultAndAdvanceAction } from "@/lib/actions/lab";
import { AttachmentUploadField } from "@/app/admin/AttachmentUploadField";
import { AutoRefresh } from "../AutoRefresh";
import { ClockIcon, StethoscopeIcon } from "../DashboardIcons";

export default async function LabPage() {
  const session = await getSession();
  if (!session || session.role !== "LAB" || !session.doctorId) redirect("/login");

  const clinic = await getClinic(session.clinicId);
  const myDepartmentId = await getMyDepartmentId(session.clinicId, session.doctorId);
  const [stageQueue, fields] = await Promise.all([
    listStageQueue(session.clinicId, myDepartmentId, clinic.timezone),
    listLabFieldDefinitions(session.clinicId, myDepartmentId),
  ]);

  return (
    <div>
      <AutoRefresh />
      <div className="page-header">
        <h1>Lab queue</h1>
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
          Shared — any staff in your department can pick these up.
        </p>

        {fields.length === 0 ? (
          <p className="empty-state">
            This lab has no result fields configured yet — set them up from{" "}
            <Link href="/admin/departments">Departments</Link>.
          </p>
        ) : stageQueue.length === 0 ? (
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
                <form action={recordLabResultAndAdvanceAction} className="stack" style={{ maxWidth: 480 }}>
                  <input type="hidden" name="appointmentId" value={a.id} />
                  {fields.map((f) => {
                    const name = `field_${f.id}`;
                    const label = `${f.label}${f.required ? " *" : ""}`;
                    if (f.fieldType === "ATTACHMENT") {
                      return <AttachmentUploadField key={f.id} name={name} label={label} required={f.required} />;
                    }
                    if (f.fieldType === "TEXTAREA") {
                      return (
                        <label key={f.id}>
                          {label}
                          <textarea name={name} rows={3} required={f.required} />
                        </label>
                      );
                    }
                    return (
                      <label key={f.id}>
                        {label}
                        <input name={name} type={f.fieldType === "NUMBER" ? "number" : "text"} step={f.fieldType === "NUMBER" ? "any" : undefined} required={f.required} />
                      </label>
                    );
                  })}
                  <button type="submit">Save result &amp; send to next stage →</button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
