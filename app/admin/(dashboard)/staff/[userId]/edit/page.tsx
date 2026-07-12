import { redirect } from "next/navigation";
import Link from "next/link";
import { listDepartments, listDoctors, listStaff } from "@/src/adminHandlers";
import { editStaffAction } from "@/lib/actions/staff";
import { getSession } from "@/lib/session";
import { PhotoUploadField } from "@/app/admin/PhotoUploadField";

export default async function EditStaffPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { userId } = await params;
  const [staff, doctors, departments] = await Promise.all([
    listStaff(session.clinicId),
    listDoctors(session.clinicId),
    listDepartments(session.clinicId),
  ]);
  const member = staff.find((u) => u.id === userId);
  if (!member || member.role === "CLINIC_ADMIN") redirect("/admin/staff");

  const unlinkedDoctors = doctors.filter((d) => !d.user || d.user.id === member.id);
  const hasLabDepartment = departments.some((d) => d.kind === "LAB");

  return (
    <div>
      <p>
        <Link href="/admin/staff">&larr; Back to staff</Link>
      </p>
      <h1>Edit {member.email}</h1>

      <div className="card">
        <form action={editStaffAction} className="stack">
          <input type="hidden" name="userId" value={member.id} />
          <PhotoUploadField name="photoUrl" defaultValue={member.photoUrl} />
          <label>
            Role
            <select name="role" defaultValue={member.role} required>
              <option value="RECEPTIONIST">Receptionist</option>
              <option value="DOCTOR">Doctor</option>
              <option value="NURSE">Nurse</option>
              {(hasLabDepartment || member.role === "LAB") && <option value="LAB">Lab</option>}
            </select>
          </label>
          <label>
            If Doctor/Nurse/Lab — which staff record is this?
            <select name="doctorId" defaultValue={member.doctorId ?? ""}>
              <option value="">N/A (receptionist)</option>
              {unlinkedDoctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">Save changes</button>
        </form>
      </div>
    </div>
  );
}
