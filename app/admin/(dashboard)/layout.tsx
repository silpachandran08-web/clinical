import Link from "next/link";
import { logout } from "@/lib/actions/auth";

// These pages read live DB state (clinics/doctors/patients/appointments) on
// every request — without this, Next.js prerenders them once at build time
// and serves that frozen snapshot to everyone until the next deploy.
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav className="nav">
        <Link href="/admin">Overview</Link>
        <Link href="/admin/clinic">Clinic</Link>
        <Link href="/admin/departments">Departments</Link>
        <Link href="/admin/doctors">Doctors</Link>
        <Link href="/admin/patients">Patients</Link>
        <Link href="/admin/appointments">Appointments</Link>
        <div className="nav-spacer" />
        <form action={logout} style={{ display: "flex", alignItems: "center" }}>
          <button type="submit" className="secondary">
            Log out
          </button>
        </form>
      </nav>
      <div className="container">{children}</div>
    </>
  );
}
