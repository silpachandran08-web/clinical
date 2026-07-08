import { redirect } from "next/navigation";
import {
  getClinic,
  listClinicAppointments,
  listDepartments,
  listDoctors,
  listPatients,
} from "@/src/adminHandlers";
import { getSession } from "@/lib/session";

export default async function AdminHomePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [clinic, departments, doctors, patients, appointments] = await Promise.all([
    getClinic(session.clinicId),
    listDepartments(session.clinicId),
    listDoctors(session.clinicId),
    listPatients(session.clinicId),
    listClinicAppointments(session.clinicId),
  ]);

  const now = new Date();
  const upcoming = appointments.filter((a) => a.status === "CONFIRMED" && a.slot.startsAt > now);

  return (
    <div>
      <h1>{clinic.name}</h1>
      <p className="muted">WhatsApp number: {clinic.whatsappNumber ?? "not set yet — configure it on the Clinic tab"}</p>

      <div className="card" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <Stat label="Departments" value={departments.length} href="/admin/departments" />
        <Stat label="Doctors" value={doctors.length} href="/admin/doctors" />
        <Stat label="Patients" value={patients.length} href="/admin/patients" />
        <Stat label="Upcoming appointments" value={upcoming.length} href="/admin/appointments" />
      </div>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <a href={href} style={{ textDecoration: "none", color: "inherit" }}>
      <div style={{ fontSize: 28, fontWeight: 600 }}>{value}</div>
      <div className="muted">{label}</div>
    </a>
  );
}
