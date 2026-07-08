import { redirect } from "next/navigation";
import { listDoctors, listStaff } from "@/src/adminHandlers";
import { inviteStaffAction } from "@/lib/actions/staff";
import { getSession } from "@/lib/session";

export default async function StaffPage() {
  const session = await getSession();
  if (!session) redirect("/login");

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
        {staff.length === 0 ? (
          <p className="empty-state">No staff invited yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Linked doctor</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((u) => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>{u.doctor?.name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
