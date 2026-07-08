import { redirect } from "next/navigation";
import { getFirstClinic, listClinicAppointments } from "@/src/adminHandlers";
import { cancelAppointmentAction } from "@/lib/actions/appointments";

export default async function AppointmentsPage() {
  const clinic = await getFirstClinic();
  if (!clinic) redirect("/admin/clinic");
  const appointments = await listClinicAppointments(clinic.id);

  return (
    <div>
      <h1>Appointments</h1>
      <div className="card">
        {appointments.length === 0 ? (
          <p className="empty-state">No appointments yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Doctor</th>
                <th>When</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a.id}>
                  <td>{a.patient.name ?? a.patient.phone}</td>
                  <td>{a.doctor.name}</td>
                  <td>{a.slot.startsAt.toLocaleString()}</td>
                  <td>
                    <span
                      className={`badge ${
                        a.status === "CONFIRMED" ? "success" : a.status === "CANCELLED" ? "danger" : ""
                      }`}
                    >
                      {a.status}
                    </span>
                  </td>
                  <td>
                    {a.status === "CONFIRMED" && (
                      <form action={cancelAppointmentAction}>
                        <input type="hidden" name="clinicId" value={clinic.id} />
                        <input type="hidden" name="appointmentId" value={a.id} />
                        <button type="submit" className="danger">
                          Cancel
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
