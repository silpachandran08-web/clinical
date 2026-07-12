import { redirect } from "next/navigation";
import Link from "next/link";
import { listDepartments, listLabFieldDefinitions } from "@/src/adminHandlers";
import { editDepartmentAction } from "@/lib/actions/departments";
import { getSession } from "@/lib/session";
import { LabFieldEditor } from "./LabFieldEditor";

export default async function EditDepartmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ departmentId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { departmentId } = await params;
  const searchParamsResolved = await searchParams;
  const departments = await listDepartments(session.clinicId);
  const department = departments.find((d) => d.id === departmentId);
  if (!department) redirect("/admin/departments");

  const fields = department.kind === "LAB" ? await listLabFieldDefinitions(session.clinicId, departmentId) : [];

  return (
    <div>
      <p>
        <Link href="/admin/departments">&larr; Back to departments</Link>
      </p>
      <h1>Edit {department.name}</h1>

      <div className="card">
        <form action={editDepartmentAction} className="stack">
          <input type="hidden" name="departmentId" value={department.id} />
          <label>
            Name
            <input name="name" defaultValue={department.name} required />
          </label>
          <label>
            Kind
            <select name="kind" defaultValue={department.kind}>
              <option value="MEDICAL">Medical (bookable specialty, staffed by doctors)</option>
              <option value="NURSE">Nurse (process stage, staffed by nurses)</option>
              <option value="LAB">Lab (process stage, staffed by lab techs, with custom result fields)</option>
            </select>
          </label>
          <label className="card-title-icon" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <input type="checkbox" name="isBookable" defaultChecked={department.isBookable} style={{ width: "auto" }} />
            Bookable by patients (uncheck for process-only departments like &quot;Nurse&quot;)
          </label>
          <button type="submit">Save changes</button>
        </form>
      </div>

      {department.kind === "LAB" && (
        <div className="card">
          <h2>Lab result fields</h2>
          <p className="muted" style={{ marginTop: 0, marginBottom: 14, fontSize: 12.5 }}>
            Define what this lab captures per visit — text, number, long text, or an image attachment.
          </p>
          {searchParamsResolved.error && (
            <p className="error" style={{ marginBottom: 12 }}>{searchParamsResolved.error}</p>
          )}
          <LabFieldEditor departmentId={department.id} initialFields={fields} />
        </div>
      )}
    </div>
  );
}
