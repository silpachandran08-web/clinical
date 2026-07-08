import { redirect } from "next/navigation";
import Link from "next/link";
import { listDepartments, listDoctors } from "@/src/adminHandlers";
import { addDoctorAction, deleteDoctorAction, toggleDoctorActiveAction } from "@/lib/actions/doctors";
import { getSession } from "@/lib/session";

const DAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

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

  if (departments.length === 0) {
    return (
      <div>
        <h1>Doctors</h1>
        <p className="empty-state">
          Add a department first before adding doctors. <a href="/admin/departments">Go to Departments</a>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1>Doctors</h1>

      <div className="card">
        <h2>Add a doctor</h2>
        <form action={addDoctorAction} className="stack" style={{ maxWidth: 480 }}>
          <label>
            Name
            <input name="name" placeholder="Dr. Fatima Al-Harbi" required />
          </label>
          <label>
            Department
            <select name="departmentId" required defaultValue="">
              <option value="" disabled>
                Choose a department
              </option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>

          <label>Working days</label>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {DAYS.map((d) => (
              <label
                key={d.value}
                style={{ flexDirection: "row", alignItems: "center", gap: 4, color: "var(--text)" }}
              >
                <input type="checkbox" name="days" value={d.value} style={{ width: "auto" }} />
                {d.label}
              </label>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <label>
              Start time
              <input type="time" name="startTime" defaultValue="09:00" required />
            </label>
            <label>
              End time
              <input type="time" name="endTime" defaultValue="17:00" required />
            </label>
            <label>
              Slot length (min)
              <input type="number" name="slotDurationMinutes" defaultValue={20} min={5} step={5} required />
            </label>
          </div>

          <button type="submit">Add doctor</button>
        </form>
      </div>

      <div className="card">
        <h2>All doctors</h2>
        {params.error && <p className="error" style={{ marginBottom: 12 }}>{params.error}</p>}
        {doctors.length === 0 ? (
          <p className="empty-state">No doctors yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Department</th>
                <th>Working days</th>
                <th>Login</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {doctors.map((doc) => (
                <tr key={doc.id}>
                  <td>{doc.name}</td>
                  <td>{doc.department.name}</td>
                  <td>{doc.workingHours.map((wh) => DAYS[wh.dayOfWeek].label).join(", ") || "—"}</td>
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
        Give a doctor their own login from the <a href="/admin/staff">Staff</a> page.
      </p>
    </div>
  );
}
