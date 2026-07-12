import { redirect } from "next/navigation";
import Link from "next/link";
import { listDepartments, listDoctors, listStaff } from "@/src/adminHandlers";
import { editStaffAction } from "@/lib/actions/staff";
import { getSession } from "@/lib/session";
import { PhotoUploadField } from "@/app/admin/PhotoUploadField";
import { RoleAndStaffPicker } from "../../RoleAndStaffPicker";

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

  const unlinkedDoctors = doctors
    .filter((d) => !d.user || d.user.id === member.id)
    .map((d) => ({ id: d.id, name: d.name, departmentName: d.department.name, departmentKind: d.department.kind }));
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
          <RoleAndStaffPicker
            unlinkedDoctors={unlinkedDoctors}
            hasLabDepartment={hasLabDepartment}
            defaultRole={member.role as "RECEPTIONIST" | "DOCTOR" | "NURSE" | "LAB"}
            defaultDoctorId={member.doctorId ?? ""}
          />
          <button type="submit">Save changes</button>
        </form>
      </div>
    </div>
  );
}
