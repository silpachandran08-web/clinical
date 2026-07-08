import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { listMyQueue } from "@/src/doctorHandlers";
import { completeConsultationAction, startConsultationAction } from "@/lib/actions/doctor";

export default async function DoctorQueuePage() {
  const session = await getSession();
  if (!session || session.role !== "DOCTOR" || !session.doctorId) redirect("/login");

  const queue = await listMyQueue(session.clinicId, session.doctorId);
  const waiting = queue.filter((a) => a.status === "CHECKED_IN");
  const current = queue.find((a) => a.status === "IN_PROGRESS");

  return (
    <div>
      <h1>Today&apos;s queue</h1>

      {current && (
        <div className="card" style={{ borderColor: "var(--accent)" }}>
          <h2>In progress: {current.patient.name ?? current.patient.phone}</h2>
          <p className="muted">
            Slot {current.slot.startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ·{" "}
            <Link href={`/doctor/patients/${current.patient.id}`}>View patient history</Link>
          </p>
          <form action={completeConsultationAction} className="stack">
            <input type="hidden" name="appointmentId" value={current.id} />
            <label>
              Notes
              <input name="notes" placeholder="Consultation notes" />
            </label>
            <label>
              Prescription
              <input name="prescription" placeholder="Prescription, if any" />
            </label>
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
