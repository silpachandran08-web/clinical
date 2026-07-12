import { redirect } from "next/navigation";
import Link from "next/link";
import { listDoctors, listStaff } from "@/src/adminHandlers";
import { inviteStaffAction, removeStaffAction } from "@/lib/actions/staff";
import { getSession } from "@/lib/session";
import { AvatarThumb } from "@/app/AvatarThumb";
import { PhotoUploadField } from "@/app/admin/PhotoUploadField";

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const [staff, doctors] = await Promise.all([listStaff(session.clinicId), listDoctors(session.clinicId)]);
  const unlinkedDoctors = doctors.filter((d) => !d.user);

  return (
    <div>
      <h1>Staff</h1>

      <div className="card">
        <h2>Invite a receptionist or doctor</h2>
        <p className="muted">
          No password to set — they sign in with this email at <code>/login</code> using a one-time code.
        </p>
        <form action={inviteStaffAction} className="stack">
          <PhotoUploadField name="photoUrl" />
          <label>
            Email
            <input type="email" name="email" required />
          </label>
          <label>
            Role
            <select name="role" required defaultValue="RECEPTIONIST">
              <option value="RECEPTIONIST">Receptionist</option>
              <option value="DOCTOR">Doctor</option>
            </select>
          </label>
          <label>
            If Doctor — which doctor record is this?
            <select name="doctorId" defaultValue="">
              <option value="">N/A (receptionist)</option>
              {unlinkedDoctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
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
