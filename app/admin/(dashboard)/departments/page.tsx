import { redirect } from "next/navigation";
import { listDepartments } from "@/src/adminHandlers";
import { addDepartmentAction } from "@/lib/actions/departments";
import { getSession } from "@/lib/session";

export default async function DepartmentsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const departments = await listDepartments(session.clinicId);

  return (
    <div>
      <h1>Departments</h1>

      <div className="card">
        <h2>Add a department</h2>
        <form action={addDepartmentAction} className="stack">
          <label>
            Name
            <input name="name" placeholder="e.g. Dermatology" required />
          </label>
          <label className="card-title-icon" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <input type="checkbox" name="isBookable" defaultChecked style={{ width: "auto" }} />
            Bookable by patients (uncheck for process-only departments like &quot;Nurse&quot;)
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
                <th>Bookable</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((d) => (
                <tr key={d.id}>
                  <td>{d.name}</td>
                  <td>{d.isBookable ? "Yes" : "No"}</td>
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
