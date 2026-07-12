import { redirect } from "next/navigation";
import Link from "next/link";
import { listDepartments, listDoctors } from "@/src/adminHandlers";
import { editDoctorAction } from "@/lib/actions/doctors";
import { getSession } from "@/lib/session";
import { PhotoUploadField } from "@/app/admin/PhotoUploadField";
import { ScheduleFields } from "../../ScheduleFields";

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

  const departmentOptions = departments.map((d) => ({ id: d.id, name: d.name, kind: d.kind }));
  const activeDays = doctor.workingHours.map((wh) => wh.dayOfWeek);
  const templateHours = doctor.workingHours[0];

  return (
    <div>
      <p>
        <Link href="/admin/doctors">&larr; Back to staff</Link>
      </p>
      <h1>Edit {doctor.name}</h1>

      <div className="card">
        <form action={editDoctorAction} className="stack" style={{ maxWidth: 480 }}>
          <input type="hidden" name="doctorId" value={doctor.id} />
          <PhotoUploadField name="photoUrl" defaultValue={doctor.photoUrl} />
          <label>
            Name
            <input name="name" defaultValue={doctor.name} required />
          </label>

          <ScheduleFields
            departments={departmentOptions}
            defaultDepartmentId={doctor.departmentId}
            defaultConsultationFee={Number(doctor.consultationFee) || 0}
            defaultActiveDays={activeDays}
            defaultStartTime={templateHours?.startTime ?? "09:00"}
            defaultEndTime={templateHours?.endTime ?? "17:00"}
            defaultSlotDurationMinutes={templateHours?.slotDurationMinutes ?? 20}
          />

          <div style={{ borderTop: "1px solid var(--border-soft)", paddingTop: 16, marginTop: 8 }} />
          <h3 style={{ marginBottom: 12 }}>Professional Details (Optional)</h3>
          <label>
            Specialization
            <input name="specialization" defaultValue={doctor.specialization || ""} maxLength={200} />
          </label>
          <label>
            Qualifications
            <textarea
              name="qualifications"
              defaultValue={doctor.qualifications || ""}
              maxLength={500}
              style={{ minHeight: 80 }}
              placeholder="e.g., MD, MBBS, Fellowship"
            />
          </label>
          <label>
            Professional Bio
            <textarea
              name="bio"
              defaultValue={doctor.bio || ""}
              maxLength={1000}
              style={{ minHeight: 100 }}
              placeholder="Professional biography and experience summary"
            />
          </label>
          <label>
            License Number
            <input name="licenseNumber" defaultValue={doctor.licenseNumber || ""} maxLength={100} />
          </label>
          <label>
            Years of Experience
            <input type="number" name="yearsOfExperience" min="0" max="60" defaultValue={doctor.yearsOfExperience || ""} />
          </label>

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
