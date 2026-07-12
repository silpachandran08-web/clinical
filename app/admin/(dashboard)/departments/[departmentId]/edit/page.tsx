import { redirect } from "next/navigation";
import Link from "next/link";
import { listDepartments } from "@/src/adminHandlers";
import { editDepartmentAction } from "@/lib/actions/departments";
import { getSession } from "@/lib/session";

export default async function EditDepartmentPage({
  params,
}: {
  params: Promise<{ departmentId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { departmentId } = await params;
  const departments = await listDepartments(session.clinicId);
  const department = departments.find((d) => d.id === departmentId);
  if (!department) redirect("/admin/departments");

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
          <label className="card-title-icon" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <input type="checkbox" name="isBookable" defaultChecked={department.isBookable} style={{ width: "auto" }} />
            Bookable by patients (uncheck for process-only departments like &quot;Nurse&quot;)
          </label>
          <button type="submit">Save changes</button>
        </form>
      </div>
    </div>
  );
}
