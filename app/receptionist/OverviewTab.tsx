import type { Clinic } from "@prisma/client";
import { resolveEscalationAction, checkInAction } from "@/lib/actions/receptionist";
import { EscalationInstructionForm } from "./EscalationInstructionForm";
import {
  AlertIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  PatientIcon,
  StethoscopeIcon,
} from "../DashboardIcons";

interface OverviewTabProps {
  clinic: Clinic;
  todayDoctorStatus: Array<any>;
  appointments: Array<any>;
  escalations: Array<any>;
  timeZone: string;
}

export function OverviewTab({
  clinic,
  todayDoctorStatus,
  appointments,
  escalations,
  timeZone,
}: OverviewTabProps) {
  const waitingCount = todayDoctorStatus.reduce((sum, d) => sum + d.waiting.length, 0);
  const inProgressCount = todayDoctorStatus.filter((d) => d.inProgressWith).length;
  const availableDoctors = todayDoctorStatus.filter((d) => d.isLive);

  return (
    <div>
      {/* ESCALATIONS - Priority Alert */}
      {escalations.length > 0 && (
        <div className="card" style={{ borderColor: "var(--warning)", borderWidth: "2px", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <AlertIcon size={20} style={{ color: "var(--warning)" }} />
            <h2 style={{ margin: 0, color: "var(--warning)", fontSize: 15, fontWeight: 700 }}>
              Patient Follow-ups ({escalations.length})
            </h2>
          </div>
          <p className="muted" style={{ margin: "0 0 14px", fontSize: 12.5 }}>
            WhatsApp AI handed over these chats — reply and mark handled
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {escalations.map((e) => (
              <div
                key={e.id}
                style={{
                  padding: "12px 14px",
                  background: "var(--surface-2)",
                  borderRadius: "var(--radius-sm)",
                  borderLeft: e.urgent ? "3px solid var(--danger)" : "3px solid var(--warning)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <PatientIcon size={14} />
                    <strong style={{ fontSize: 13, color: "var(--text)" }}>
                      {e.patientName ?? e.patientPhone}
                    </strong>
                    {e.urgent && (
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 6px",
                        background: "var(--danger-soft)",
                        color: "var(--danger)",
                        borderRadius: 3,
                      }}>
                        URGENT
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
                    {e.reason}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {e.createdAt.toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone,
                    })}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <a
                    className="btn-link"
                    href={`https://wa.me/${e.patientPhone.replace("+", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 12, whiteSpace: "nowrap" }}
                  >
                    WhatsApp
                  </a>
                  <form action={resolveEscalationAction} style={{ margin: 0 }}>
                    <input type="hidden" name="escalationId" value={e.id} />
                    <button
                      type="submit"
                      style={{
                        fontSize: 12,
                        padding: "5px 10px",
                        background: "var(--success)",
                        color: "white",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      Done
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MAIN GRID - 2 Column Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, alignItems: "start" }}>
        {/* LEFT: TODAY'S APPOINTMENTS */}
        <div className="card">
          <h2 className="card-title-icon" style={{ marginBottom: 12 }}>
            <CalendarIcon /> Today's Appointments ({appointments.length})
          </h2>

          {appointments.length === 0 ? (
            <p className="empty-state" style={{ margin: 0, padding: "20px 0", textAlign: "center" }}>
              No appointments today
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {appointments.map((a) => (
                <div
                  key={a.id}
                  style={{
                    padding: "10px 12px",
                    background: "var(--surface-2)",
                    borderRadius: "var(--radius-sm)",
                    borderLeft: `3px solid ${
                      a.status === "CANCELLED" || a.status === "NO_SHOW"
                        ? "var(--danger)"
                        : a.status === "COMPLETED"
                          ? "var(--success)"
                          : "var(--accent)"
                    }`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--accent)",
                        minWidth: "45px",
                      }}
                    >
                      {a.slot.startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone })}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--text)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {a.patient.name ?? a.patient.phone}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {a.doctor.name}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "2px 6px",
                        borderRadius: 3,
                        background: a.bookedByStaff ? "var(--surface)" : "var(--accent-soft)",
                        color: a.bookedByStaff ? "var(--text-muted)" : "var(--accent)",
                        border: a.bookedByStaff ? "1px solid var(--border)" : "none",
                      }}
                    >
                      {a.bookedByStaff ? "Walk-in" : "Online"}
                    </span>

                    {a.status === "CONFIRMED" && (
                      <form action={checkInAction} style={{ margin: 0 }}>
                        <input type="hidden" name="appointmentId" value={a.id} />
                        <button
                          type="submit"
                          style={{
                            fontSize: 11,
                            padding: "4px 8px",
                            background: "var(--success)",
                            color: "white",
                            border: "none",
                            borderRadius: 3,
                            cursor: "pointer",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Check in
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: DOCTOR STATUS + QUICK STATS */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Doctor Availability Card */}
          <div className="card" style={{ marginBottom: 0 }}>
            <h2 className="card-title-icon" style={{ marginBottom: 10 }}>
              <StethoscopeIcon size={16} /> Doctors Now
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {todayDoctorStatus.length === 0 ? (
                <p className="empty-state" style={{ margin: 0, fontSize: 12 }}>
                  No active doctors
                </p>
              ) : (
                todayDoctorStatus.slice(0, 5).map((d) => (
                  <div
                    key={d.id}
                    style={{
                      padding: "8px 10px",
                      background: "var(--surface-2)",
                      borderRadius: "var(--radius-sm)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: d.isLive ? "var(--success)" : "var(--danger)",
                        }}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "var(--text)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {d.name}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          {d.inProgressWith
                            ? `With ${d.inProgressWith.patient.name ?? d.inProgressWith.patient.phone}`
                            : d.openSlots.length > 0
                              ? `${d.openSlots.length} slots`
                              : "Fully booked"}
                        </div>
                      </div>
                    </div>
                    {d.openSlots.length > 0 && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 6px",
                          background: "var(--success-soft)",
                          color: "var(--success)",
                          borderRadius: 3,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {d.openSlots.length}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div
              className="stat-card"
              style={{
                padding: "10px 12px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
                {inProgressCount}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                In consultation
              </div>
            </div>
            <div
              className="stat-card"
              style={{
                padding: "10px 12px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
                {waitingCount}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                Waiting
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
