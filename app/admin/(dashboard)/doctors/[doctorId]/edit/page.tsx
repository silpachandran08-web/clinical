import { redirect } from "next/navigation";
import Link from "next/link";
import { listDepartments, listDoctors } from "@/src/adminHandlers";
import { editDoctorAction } from "@/lib/actions/doctors";
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

export default async function EditDoctorPage({
  params,
}: {
  params: Promise<{ doctorId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { doctorId } = await params;
  const [departments, doctors] = await Promise.all([
    listDepartments(session.clinicId),
    listDoctors(session.clinicId),
  ]);
  const doctor = doctors.find((d) => d.id === doctorId);
  if (!doctor) redirect("/admin/doctors");

  const activeDays = new Set(doctor.workingHours.map((wh) => wh.dayOfWeek));
  const templateHours = doctor.workingHours[0];

  return (
    <div>
      <p>
        <Link href="/admin/doctors">&larr; Back to doctors</Link>
      </p>
      <h1>Edit {doctor.name}</h1>

      <div className="card">
        <form action={editDoctorAction} className="stack" style={{ maxWidth: 480 }}>
          <input type="hidden" name="doctorId" value={doctor.id} />
          <label>
            Name
            <input name="name" defaultValue={doctor.name} required />
          </label>
          <label>
            Department
            <select name="departmentId" defaultValue={doctor.departmentId} required>
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
                <input
                  type="checkbox"
                  name="days"
                  value={d.value}
                  defaultChecked={activeDays.has(d.value)}
                  style={{ width: "auto" }}
                />
                {d.label}
              </label>
            ))}
          </div>

          <div className="time-row">
            <label>
              Start time
              <input type="time" name="startTime" defaultValue={templateHours?.startTime ?? "09:00"} required />
            </label>
            <label>
              End time
              <input type="time" name="endTime" defaultValue={templateHours?.endTime ?? "17:00"} required />
            </label>
            <label>
              Slot length (min)
              <input
                type="number"
                name="slotDurationMinutes"
                defaultValue={templateHours?.slotDurationMinutes ?? 20}
                min={5}
                step={5}
                required
              />
            </label>
          </div>

          <p className="muted" style={{ fontSize: 12.5 }}>
            Saving replaces the weekly schedule and regenerates not-yet-booked future slots. Already
            confirmed appointments are never affected.
          </p>

          <button type="submit">Save changes</button>
        </form>
      </div>
    </div>
  );
}
