import { redirect } from "next/navigation";
import {
  getFirstClinic,
  listClinicAppointments,
  listDepartments,
  listDoctors,
  listPatients,
} from "@/src/adminHandlers";

export default async function AdminHomePage() {
  const clinic = await getFirstClinic();
  if (!clinic) redirect("/admin/clinic");

  const [departments, doctors, patients, appointments] = await Promise.all([
    listDepartments(clinic.id),
    listDoctors(clinic.id),
    listPatients(clinic.id),
    listClinicAppointments(clinic.id),
  ]);

  const now = new Date();
  const upcoming = appointments.filter((a) => a.status === "CONFIRMED" && a.slot.startsAt > now);

  return (
    <div>
      <h1>{clinic.name}</h1>
      <p className="muted">WhatsApp number: {clinic.whatsappNumber}</p>

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
