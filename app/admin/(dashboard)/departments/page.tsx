import { redirect } from "next/navigation";
import Link from "next/link";
import { listDepartments } from "@/src/adminHandlers";
import { addDepartmentAction, deleteDepartmentAction } from "@/lib/actions/departments";
import { getSession } from "@/lib/session";

export default async function DepartmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await searchParams;
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
          <label>
            Kind
            <select name="kind" defaultValue="MEDICAL">
              <option value="MEDICAL">Medical (bookable specialty, staffed by doctors)</option>
              <option value="NURSE">Nurse (process stage, staffed by nurses)</option>
              <option value="LAB">Lab (process stage, staffed by lab techs, with custom result fields)</option>
            </select>
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
        {params.error && <p className="error" style={{ marginBottom: 12 }}>{params.error}</p>}
        {departments.length === 0 ? (
          <p className="empty-state">No departments yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Kind</th>
                <th>Bookable</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {departments.map((d) => (
                <tr key={d.id}>
                  <td>{d.name}</td>
                  <td>{d.kind === "MEDICAL" ? "Medical" : d.kind === "NURSE" ? "Nurse" : "Lab"}</td>
                  <td>{d.isBookable ? "Yes" : "No"}</td>
                  <td>{d.createdAt.toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Link href={`/admin/departments/${d.id}/edit`}>
                        <button type="button" className="secondary">
                          Edit
                        </button>
                      </Link>
                      <form action={deleteDepartmentAction}>
                        <input type="hidden" name="departmentId" value={d.id} />
                        <button type="submit" className="danger">
                          Delete
                        </button>
                      </form>
                    </div>
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
