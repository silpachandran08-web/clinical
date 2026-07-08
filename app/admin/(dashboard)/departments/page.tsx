import { redirect } from "next/navigation";
import { getFirstClinic, listDepartments } from "@/src/adminHandlers";
import { addDepartmentAction } from "@/lib/actions/departments";

export default async function DepartmentsPage() {
  const clinic = await getFirstClinic();
  if (!clinic) redirect("/admin/clinic");
  const departments = await listDepartments(clinic.id);

  return (
    <div>
      <h1>Departments</h1>

      <div className="card">
        <h2>Add a department</h2>
        <form action={addDepartmentAction} className="stack">
          <input type="hidden" name="clinicId" value={clinic.id} />
          <label>
            Name
            <input name="name" placeholder="e.g. Dermatology" required />
          </label>
          <button type="submit">Add department</button>
        </form>
      </div>

      <div className="card">
        <h2>All departments</h2>
        {departments.length === 0 ? (
          <p className="empty-state">No departments yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((d) => (
                <tr key={d.id}>
                  <td>{d.name}</td>
                  <td>{d.createdAt.toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
