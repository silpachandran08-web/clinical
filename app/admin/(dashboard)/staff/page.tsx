import { redirect } from "next/navigation";
import Link from "next/link";
import { listDepartments, listDoctors, listStaff } from "@/src/adminHandlers";
import { inviteStaffAction, removeStaffAction } from "@/lib/actions/staff";
import { getSession } from "@/lib/session";
import { AvatarThumb } from "@/app/AvatarThumb";
import { PhotoUploadField } from "@/app/admin/PhotoUploadField";
import { RoleAndStaffPicker } from "./RoleAndStaffPicker";

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const [staff, doctors, departments] = await Promise.all([
    listStaff(session.clinicId),
    listDoctors(session.clinicId),
    listDepartments(session.clinicId),
  ]);
  const unlinkedDoctors = doctors
    .filter((d) => !d.user)
    .map((d) => ({ id: d.id, name: d.name, departmentName: d.department.name, departmentKind: d.department.kind }));
  const hasLabDepartment = departments.some((d) => d.kind === "LAB");

  return (
    <div>
      <h1>Staff</h1>

      <div className="card">
        <h2>Invite staff</h2>
        <p className="muted">
          No password to set — they sign in with this email at <code>/login</code> using a one-time code.
        </p>
        <form action={inviteStaffAction} className="stack">
          <PhotoUploadField name="photoUrl" />
          <label>
            Email
            <input type="email" name="email" required />
          </label>
          <RoleAndStaffPicker unlinkedDoctors={unlinkedDoctors} hasLabDepartment={hasLabDepartment} />
          <button type="submit">Send invite</button>
        </form>
      </div>

      <div className="card">
        <h2>All staff</h2>
        {params.error && <p className="error" style={{ marginBottom: 12 }}>{params.error}</p>}
        {staff.length === 0 ? (
          <p className="empty-state">No staff invited yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Email</th>
                <th>Role</th>
                <th>Linked doctor</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {staff.map((u) => (
                <tr key={u.id}>
                  <td>
                    <AvatarThumb src={u.photoUrl} name={u.name || u.email} size={32} />
                  </td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>{u.doctor?.name ?? "—"}</td>
                  <td>
                    {u.role === "CLINIC_ADMIN" ? (
                      <span className="muted">—</span>
                    ) : (
                      <div style={{ display: "flex", gap: 6 }}>
                        <Link href={`/admin/staff/${u.id}/edit`}>
                          <button type="button" className="secondary">
                            Edit
                          </button>
                        </Link>
                        <form action={removeStaffAction}>
                          <input type="hidden" name="userId" value={u.id} />
                          <button type="submit" className="danger">
                            Remove
                          </button>
                        </form>
                      </div>
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
