import { redirect } from "next/navigation";
import { logout } from "@/lib/actions/auth";
import { touchDoctorLastSeen } from "@/src/doctorHandlers";
import { getSession } from "@/lib/session";
import { prisma } from "@/src/db/client";
import { AvatarThumb } from "@/app/AvatarThumb";

export const dynamic = "force-dynamic";

export default async function LabLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "LAB" || !session.doctorId) redirect("/login");

  const labStaff = await prisma.doctor.findUnique({ where: { id: session.doctorId } });
  if (labStaff) await touchDoctorLastSeen(labStaff.id);

  return (
    <>
      <nav className="nav">
        <span style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", color: "var(--text)" }}>
          <AvatarThumb src={labStaff?.photoUrl} name={labStaff?.name ?? "Lab"} size={28} />
          {labStaff?.name ?? "Lab"}
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
