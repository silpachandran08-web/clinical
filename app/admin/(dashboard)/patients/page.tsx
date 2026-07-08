import { redirect } from "next/navigation";
import { getFirstClinic, listPatients } from "@/src/adminHandlers";

export default async function PatientsPage() {
  const clinic = await getFirstClinic();
  if (!clinic) redirect("/admin/clinic");
  const patients = await listPatients(clinic.id);

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
