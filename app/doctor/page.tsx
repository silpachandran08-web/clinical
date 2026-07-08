import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { countCompletedToday, listMyQueue } from "@/src/doctorHandlers";
import { searchPatients } from "@/src/receptionistHandlers";
import { completeConsultationAction, startConsultationAction } from "@/lib/actions/doctor";
import { PrescriptionBuilder } from "./PrescriptionBuilder";

export default async function DoctorQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "DOCTOR" || !session.doctorId) redirect("/login");

  const params = await searchParams;
  const q = params.q ?? "";

  const [queue, completedToday, searchResults] = await Promise.all([
    listMyQueue(session.clinicId, session.doctorId),
    countCompletedToday(session.clinicId, session.doctorId),
    q ? searchPatients(session.clinicId, q) : Promise.resolve([]),
  ]);

  const waiting = queue.filter((a) => a.status === "CHECKED_IN");
  const current = queue.find((a) => a.status === "IN_PROGRESS");
  const now = new Date();

  return (
    <div>
      <div className="page-header">
        <h1>Today&apos;s queue</h1>
        <span className="date">
          {now.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </span>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">{waiting.length}</div>
          <div className="stat-label">Waiting</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{current ? 1 : 0}</div>
          <div className="stat-label">In consultation</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{completedToday}</div>
          <div className="stat-label">Completed today</div>
        </div>
      </div>

      <div className="card">
        <h2>Search patients</h2>
        <form method="get" className="stack" style={{ marginBottom: 4 }}>
          <label>
            Name, phone, or email
            <input name="q" defaultValue={q} placeholder="Search all patients at this clinic" />
          </label>
          <button type="submit" className="secondary" style={{ alignSelf: "flex-start" }}>
            Search
          </button>
        </form>

        {q && (
          <div style={{ marginTop: 16 }}>
            {searchResults.length === 0 ? (
              <p className="empty-state">No patients match &quot;{q}&quot;.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Visits</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {searchResults.map((p) => (
                    <tr key={p.id}>
                      <td>{p.name ?? "—"}</td>
                      <td>{p.phone}</td>
                      <td>{p.email ?? "—"}</td>
                      <td>{p._count.appointments}</td>
                      <td>
                        <Link href={`/doctor/patients/${p.id}`}>View history</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {current && (
        <div className="card" style={{ borderColor: "var(--accent)" }}>
          <h2>In progress: {current.patient.name ?? current.patient.phone}</h2>
          <p className="muted">
            Slot {current.slot.startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ·{" "}
            <Link href={`/doctor/patients/${current.patient.id}`}>View patient history</Link>
          </p>
          <form action={completeConsultationAction} className="stack" style={{ maxWidth: 560 }}>
            <input type="hidden" name="appointmentId" value={current.id} />
            <label>
              Notes
              <textarea name="notes" placeholder="Consultation notes — history, examination, diagnosis…" rows={6} />
            </label>
            <label>Prescription</label>
            <PrescriptionBuilder fieldName="prescription" />
            <button type="submit">Complete visit</button>
          </form>
        </div>
      )}

      <div className="card">
        <h2>Waiting</h2>
        {waiting.length === 0 ? (
          <p className="empty-state">
            {current ? "No one else waiting." : "No patients checked in yet."}
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Patient</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {waiting.map((a) => (
                <tr key={a.id}>
                  <td>{a.slot.startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                  <td>{a.patient.name ?? a.patient.phone}</td>
                  <td>
                    {!current && (
                      <form action={startConsultationAction}>
                        <input type="hidden" name="appointmentId" value={a.id} />
                        <button type="submit">Start consultation</button>
                      </form>
                    )}
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
