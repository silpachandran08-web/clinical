import { redirect } from "next/navigation";
import Link from "next/link";
import { listDepartments, listDoctors } from "@/src/adminHandlers";
import { addDoctorAction, deleteDoctorAction, toggleDoctorActiveAction } from "@/lib/actions/doctors";
import { getSession } from "@/lib/session";
import { AvatarThumb } from "@/app/AvatarThumb";
import { PhotoUploadField } from "@/app/admin/PhotoUploadField";
import { ScheduleFields } from "./ScheduleFields";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function DoctorsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await searchParams;

  const [departments, doctors] = await Promise.all([
    listDepartments(session.clinicId),
    listDoctors(session.clinicId),
  ]);

  const departmentOptions = departments.map((d) => ({ id: d.id, name: d.name, kind: d.kind }));

  if (departments.length === 0) {
    return (
      <div>
        <h1>Clinic staff</h1>
        <p className="empty-state">
          Add a department first before adding staff. <a href="/admin/departments">Go to Departments</a>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1>Clinic staff</h1>

      <div className="card">
        <h2>Add a staff member</h2>
        <p className="muted" style={{ marginTop: 0, marginBottom: 14, fontSize: 12.5 }}>
          Doctors, nurses, and lab techs all live here — the department's kind decides which fields apply.
        </p>
        <form action={addDoctorAction} className="stack" style={{ maxWidth: 480 }}>
          <PhotoUploadField name="photoUrl" />
          <label>
            Name
            <input name="name" placeholder="e.g. Dr. Fatima Al-Harbi / Sara (nurse)" required />
          </label>

          <ScheduleFields departments={departmentOptions} />

          <button type="submit">Add staff member</button>
        </form>
      </div>

      <div className="card">
        <h2>All staff records</h2>
        {params.error && <p className="error" style={{ marginBottom: 12 }}>{params.error}</p>}
        {doctors.length === 0 ? (
          <p className="empty-state">No staff records yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Name</th>
                <th>Department</th>
                <th>Specialization</th>
                <th>Consultation Fee</th>
                <th>Working days</th>
                <th>Login</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {doctors.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <AvatarThumb src={doc.photoUrl} name={doc.name} size={32} />
                  </td>
                  <td>{doc.name}</td>
                  <td>{doc.department.name}</td>
                  <td>{doc.specialization || "—"}</td>
                  <td>{doc.consultationFee ? `${doc.consultationFee.toFixed(2)} SAR` : "—"}</td>
                  <td>{doc.workingHours.map((wh) => DAY_LABELS[wh.dayOfWeek]).join(", ") || "—"}</td>
                  <td>{doc.user ? doc.user.email : <span className="muted">not invited</span>}</td>
                  <td>
                    <span className={`badge ${doc.active ? "success" : "danger"}`}>
                      {doc.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Link href={`/admin/doctors/${doc.id}/edit`}>
                        <button type="button" className="secondary">
                          Edit
                        </button>
                      </Link>
                      <form action={toggleDoctorActiveAction}>
                        <input type="hidden" name="doctorId" value={doc.id} />
                        <input type="hidden" name="active" value={String(doc.active)} />
                        <button type="submit" className="secondary">
                          {doc.active ? "Deactivate" : "Activate"}
                        </button>
                      </form>
                      <form action={deleteDoctorAction}>
                        <input type="hidden" name="doctorId" value={doc.id} />
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
      <p className="muted">
        Give a staff member their own login from the <a href="/admin/staff">Staff</a> page.
      </p>
    </div>
  );
}
