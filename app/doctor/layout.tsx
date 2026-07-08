import { redirect } from "next/navigation";
import { logout } from "@/lib/actions/auth";
import { getSession } from "@/lib/session";
import { prisma } from "@/src/db/client";

export const dynamic = "force-dynamic";

export default async function DoctorLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "DOCTOR" || !session.doctorId) redirect("/login");

  const doctor = await prisma.doctor.findUnique({ where: { id: session.doctorId } });

  return (
    <>
      <nav className="nav">
        <span style={{ padding: "14px 12px", color: "var(--text)" }}>{doctor?.name ?? "Doctor"}</span>
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
