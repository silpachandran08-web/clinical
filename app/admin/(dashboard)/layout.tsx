import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/lib/actions/auth";
import { getSession } from "@/lib/session";
import { getClinic } from "@/src/adminHandlers";

// These pages read live DB state (clinics/doctors/patients/appointments) on
// every request — without this, Next.js prerenders them once at build time
// and serves that frozen snapshot to everyone until the next deploy.
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const clinic = await getClinic(session.clinicId);
  const daysLeft = Math.ceil((clinic.trialEndsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000));

  return (
    <>
      <nav className="nav">
        <Link href="/admin">Overview</Link>
        <Link href="/admin/clinic">Clinic</Link>
        <Link href="/admin/departments">Departments</Link>
        <Link href="/admin/doctors">Doctors</Link>
        <Link href="/admin/staff">Staff</Link>
        <Link href="/admin/patients">Patients</Link>
        <Link href="/admin/appointments">Appointments</Link>
        <div className="nav-spacer" />
        <form action={logout} style={{ display: "flex", alignItems: "center" }}>
          <button type="submit" className="secondary">
            Log out
          </button>
        </form>
      </nav>
      {clinic.subscriptionStatus === "TRIALING" && (
        <div
          style={{
            background: "var(--surface)",
            borderBottom: "1px solid var(--border)",
            padding: "8px 24px",
            fontSize: 13,
          }}
          className="muted"
        >
          {daysLeft > 0
            ? `Free trial — ${daysLeft} day${daysLeft === 1 ? "" : "s"} left.`
            : "Your trial has ended. Subscription billing isn't wired up yet — reach out to keep using the app."}
        </div>
      )}
      <div className="container">{children}</div>
    </>
  );
}
