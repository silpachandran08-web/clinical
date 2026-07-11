import { redirect } from "next/navigation";
import { logout } from "@/lib/actions/auth";
import { setDoctorAvailabilityAction } from "@/lib/actions/doctor";
import { touchDoctorLastSeen } from "@/src/doctorHandlers";
import { getSession } from "@/lib/session";
import { prisma } from "@/src/db/client";

export const dynamic = "force-dynamic";

export default async function DoctorLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "DOCTOR" || !session.doctorId) redirect("/login");

  const doctor = await prisma.doctor.findUnique({ where: { id: session.doctorId } });
  // Heartbeat: this layout re-renders on every AutoRefresh poll (~5s) while
  // any doctor page is open, so this doubles as "is she still here" —
  // see touchDoctorLastSeen's doc comment.
  if (doctor) await touchDoctorLastSeen(doctor.id);

  return (
    <>
      <nav className="nav">
        <span style={{ padding: "14px 12px", color: "var(--text)" }}>{doctor?.name ?? "Doctor"}</span>
        <div className="nav-spacer" />
        <form action={setDoctorAvailabilityAction} style={{ display: "flex", alignItems: "center", marginRight: 10 }}>
          <input type="hidden" name="available" value={doctor?.isAvailable ? "false" : "true"} />
          <button
            type="submit"
            className={`availability-toggle ${doctor?.isAvailable ? "available" : "unavailable"}`}
          >
            <span className="availability-dot" />
            {doctor?.isAvailable ? "Available" : "On break"}
          </button>
        </form>
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
