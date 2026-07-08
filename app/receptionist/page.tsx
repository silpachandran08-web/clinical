import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listDoctors } from "@/src/adminHandlers";
import {
  listDoctorsWithTodayStatus,
  listTodayAppointments,
  listTodayAvailability,
} from "@/src/receptionistHandlers";
import { bookWalkInAction, checkInAction } from "@/lib/actions/receptionist";

export default async function ReceptionistPage({
  searchParams,
}: {
  searchParams: Promise<{ doctorId?: string; error?: string; booked?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await searchParams;

  const [appointments, doctorStatus, allDoctors] = await Promise.all([
    listTodayAppointments(session.clinicId),
    listDoctorsWithTodayStatus(session.clinicId),
    listDoctors(session.clinicId),
  ]);

  const activeDoctors = allDoctors.filter((d) => d.active);
  const selectedDoctorId = params.doctorId ?? "";
  const availability = selectedDoctorId
    ? await listTodayAvailability(session.clinicId, selectedDoctorId)
    : [];

  return (
    <div>
      <h1>Today</h1>

      <div className="card">
        <h2>Doctor status</h2>
        {doctorStatus.length === 0 ? (
          <p className="empty-state">No active doctors yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Doctor</th>
                <th>Right now</th>
                <th>Waiting</th>
              </tr>
            </thead>
            <tbody>
              {doctorStatus.map((d) => (
                <tr key={d.id}>
                  <td>{d.name}</td>
                  <td>
                    {d.inProgressWith ? (
                      <span className="badge success">
                        With {d.inProgressWith.patient.name ?? d.inProgressWith.patient.phone}
                      </span>
                    ) : (
                      <span className="muted">Free</span>
                    )}
                  </td>
                  <td>{d.waiting.length > 0 ? `${d.waiting.length} waiting` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2>Book a walk-in</h2>
        <form method="get" style={{ marginBottom: 16 }}>
          <label>
            Doctor
            <select name="doctorId" defaultValue={selectedDoctorId}>
              <option value="">Choose a doctor</option>
              {activeDoctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} — {d.department.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="secondary" style={{ marginTop: 8 }}>
            Show today&apos;s open slots
          </button>
        </form>

        {params.error === "missing" && <p className="error">Fill in patient name, phone, and pick a slot.</p>}
        {params.booked === "1" && <p style={{ color: "var(--success)" }}>Walk-in booked.</p>}

        {selectedDoctorId && (
          <form action={bookWalkInAction} className="stack">
            <input type="hidden" name="doctorId" value={selectedDoctorId} />
            <label>
              Open slot today
              <select name="slotId" required defaultValue="">
                <option value="" disabled>
                  {availability.length === 0 ? "No open slots left today" : "Choose a time"}
                </option>
                {availability.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {slot.startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Patient name
              <input name="patientName" required />
            </label>
            <label>
              Patient phone
              <input name="patientPhone" placeholder="+9665XXXXXXXX" required />
            </label>
            <button type="submit" disabled={availability.length === 0}>
              Book walk-in
            </button>
          </form>
        )}
      </div>

      <div className="card">
        <h2>Today&apos;s schedule</h2>
        {appointments.length === 0 ? (
          <p className="empty-state">No appointments today.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a.id}>
                  <td>{a.slot.startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                  <td>
                    {a.patient.name ?? a.patient.phone}
                    {a.bookedByStaff && <span className="badge" style={{ marginLeft: 6 }}>walk-in</span>}
                  </td>
                  <td>{a.doctor.name}</td>
                  <td>
                    <span
                      className={`badge ${
                        a.status === "CANCELLED" || a.status === "NO_SHOW"
                          ? "danger"
                          : a.status === "COMPLETED"
                            ? "success"
                            : ""
                      }`}
                    >
                      {a.status}
                    </span>
                  </td>
                  <td>
                    {a.status === "CONFIRMED" && (
                      <form action={checkInAction}>
                        <input type="hidden" name="appointmentId" value={a.id} />
                        <button type="submit" className="secondary">
                          Check in
                        </button>
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
