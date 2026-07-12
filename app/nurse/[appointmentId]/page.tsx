import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getClinic } from "@/src/adminHandlers";
import { getMyDepartmentId, listStageQueue } from "@/src/doctorHandlers";
import { recordVitalsAndAdvanceAction } from "@/lib/actions/nurse";

export default async function NurseAppointmentPage({
  params,
}: {
  params: Promise<{ appointmentId: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "NURSE" || !session.doctorId) redirect("/login");

  const { appointmentId } = await params;
  const clinic = await getClinic(session.clinicId);
  const myDepartmentId = await getMyDepartmentId(session.clinicId, session.doctorId);
  const queue = await listStageQueue(session.clinicId, myDepartmentId, clinic.timezone);
  const appointment = queue.find((a) => a.id === appointmentId);
  if (!appointment) redirect("/nurse");

  return (
    <div>
      <p>
        <Link href="/nurse">&larr; Back to queue</Link>
      </p>
      <div className="page-header">
        <h1>{appointment.patient.name ?? appointment.patient.phone}</h1>
        <p className="muted">
          {appointment.slot.startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: clinic.timezone })}
          {" · for "}
          {appointment.doctor.name}
        </p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Record vitals</h2>
        <p className="muted" style={{ marginTop: 0, marginBottom: 14, fontSize: 12.5 }}>
          These vitals will be visible to the doctor once you finish.
        </p>
        <form action={recordVitalsAndAdvanceAction} className="stack" style={{ maxWidth: 560 }}>
          <input type="hidden" name="appointmentId" value={appointment.id} />
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
            <textarea name="notes" rows={3} />
          </label>
          <button type="submit">Finish &amp; send to doctor →</button>
        </form>
      </div>
    </div>
  );
}
