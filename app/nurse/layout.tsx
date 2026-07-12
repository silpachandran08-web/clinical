import { redirect } from "next/navigation";
import { logout } from "@/lib/actions/auth";
import { touchDoctorLastSeen } from "@/src/doctorHandlers";
import { getSession } from "@/lib/session";
import { prisma } from "@/src/db/client";
import { AvatarThumb } from "@/app/AvatarThumb";

export const dynamic = "force-dynamic";

export default async function NurseLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "NURSE" || !session.doctorId) redirect("/login");

  const nurse = await prisma.doctor.findUnique({ where: { id: session.doctorId } });
  if (nurse) await touchDoctorLastSeen(nurse.id);

  return (
    <>
      <nav className="nav">
        <span style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", color: "var(--text)" }}>
          <AvatarThumb src={nurse?.photoUrl} name={nurse?.name ?? "Nurse"} size={28} />
          {nurse?.name ?? "Nurse"}
        </span>
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
