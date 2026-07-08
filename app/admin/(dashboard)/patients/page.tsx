import { redirect } from "next/navigation";
import { listPatients } from "@/src/adminHandlers";
import { getSession } from "@/lib/session";

export default async function PatientsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const patients = await listPatients(session.clinicId);

  return (
    <div>
      <h1>Patients</h1>
      <div className="card">
        {patients.length === 0 ? (
          <p className="empty-state">
            No patients yet — they're created automatically the first time someone messages your
            WhatsApp number.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Appointments</th>
                <th>First seen</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.id}>
                  <td>{p.name ?? "—"}</td>
                  <td>{p.phone}</td>
                  <td>{p._count.appointments}</td>
                  <td>{p.createdAt.toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
