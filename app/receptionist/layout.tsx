import { redirect } from "next/navigation";
import { logout } from "@/lib/actions/auth";
import { getSession } from "@/lib/session";
import { getClinic } from "@/src/adminHandlers";

export const dynamic = "force-dynamic";

export default async function ReceptionistLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const clinic = await getClinic(session.clinicId);

  return (
    <>
      <nav className="nav">
        <span style={{ padding: "14px 12px", color: "var(--text)" }}>{clinic.name} — Front Desk</span>
        <div className="nav-spacer" />
        <form action={logout} style={{ display: "flex", alignItems: "center" }}>
          <button type="submit" className="secondary">
            Log out
          </button>
        </form>
      </nav>
      <div className="container container-wide">{children}</div>
    </>
  );
}
