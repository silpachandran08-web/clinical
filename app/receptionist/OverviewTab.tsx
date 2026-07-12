import type { Clinic } from "@prisma/client";
import { resolveEscalationAction, checkInAction } from "@/lib/actions/receptionist";
import { EscalationInstructionForm } from "./EscalationInstructionForm";
import { EditAppointmentModal } from "./EditAppointmentModal";
import { CancelAppointmentButton } from "./CancelAppointmentButton";
import {
  AlertIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  PatientIcon,
  StethoscopeIcon,
} from "../DashboardIcons";
import { AvatarThumb } from "../AvatarThumb";

interface OverviewTabProps {
  clinic: Clinic;
  todayDoctorStatus: Array<any>;
  appointments: Array<any>;
  escalations: Array<any>;
  timeZone: string;
}

interface DoctorGroup {
  [deptName: string]: Array<any>;
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

  // Group doctors by department
  const doctorsByDept: DoctorGroup = todayDoctorStatus.reduce((acc, doc) => {
    const dept = doc.department?.name || "Other";
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(doc);
    return acc;
  }, {});

  const sortedDepts = Object.keys(doctorsByDept).sort();

  const getDocStatus = (doc: any) => {
    if (!doc.isLive) {
      return { label: "Not working", color: "var(--text-muted)", bgColor: "var(--surface-2)" };
    }

    if (doc.inProgressWith) {
      return {
        label: `With ${doc.inProgressWith.patient.name ?? doc.inProgressWith.patient.phone}`,
        color: "var(--accent)",
        bgColor: "var(--accent-soft)",
      };
    }

    if (doc.totalSlots === 0 || doc.dayEnded) {
      return { label: "Not working", color: "var(--text-muted)", bgColor: "var(--surface-2)" };
    }

    if (doc.openSlots.length === 0) {
      return { label: "Fully booked", color: "var(--danger)", bgColor: "var(--danger-soft)" };
    }

    return {
      label: `Free, ${doc.openSlots.length} slots`,
      color: "var(--success)",
      bgColor: "var(--success-soft)",
    };
  };

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
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <PatientIcon size={14} />
                      <strong style={{ fontSize: 13, color: "var(--text)" }}>
                        {e.patientName ?? e.patientPhone}
                      </strong>
                      {e.urgent && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 6px",
                            background: "var(--danger-soft)",
                            color: "var(--danger)",
                            borderRadius: 3,
                          }}
                        >
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
                <EscalationInstructionForm escalationId={e.id} />
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
                    flexWrap: "wrap",
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
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          fontSize: 11,
                          color: "var(--text-muted)",
                          overflow: "hidden",
                        }}
                      >
                        <AvatarThumb src={a.doctor.photoUrl} name={a.doctor.name} size={16} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {a.doctor.name}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="appt-row-actions" style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
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
                    {a.status === "AT_STAGE" && a.currentDepartment && (
                      <span className="badge">At: {a.currentDepartment.name}</span>
                    )}

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

                    {(a.status === "CONFIRMED" || a.status === "CHECKED_IN") && (
                      <>
                        <EditAppointmentModal appointment={a} timeZone={timeZone} />
                        <CancelAppointmentButton appointmentId={a.id} />
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: DOCTOR STATUS BY DEPARTMENT */}
        <div className="card" style={{ marginBottom: 0 }}>
          <h2 className="card-title-icon" style={{ marginBottom: 12 }}>
            <StethoscopeIcon size={16} /> Doctors by Department
          </h2>

          {todayDoctorStatus.length === 0 ? (
            <p className="empty-state" style={{ margin: 0, fontSize: 12 }}>
              No doctors active today
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {sortedDepts.map((dept) => {
                const doctors = doctorsByDept[dept];
                return (
                  <div key={dept}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        marginBottom: 6,
                        paddingBottom: 6,
                        borderBottom: "1px solid var(--border-soft)",
                      }}
                    >
                      {dept}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {doctors.map((doc) => {
                        const status = getDocStatus(doc);
                        return (
                          <div
                            key={doc.id}
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
                                  background: doc.isLive ? "var(--success)" : "var(--danger)",
                                  flexShrink: 0,
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
                                  {doc.name}
                                </div>
                                <div
                                  style={{
                                    fontSize: 11,
                                    color: status.color,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    fontWeight: 500,
                                  }}
                                >
                                  {status.label}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick Stats */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginTop: 14,
              paddingTop: 14,
              borderTop: "1px solid var(--border-soft)",
            }}
          >
            <div
              style={{
                padding: "10px 12px",
                background: "var(--surface-2)",
                borderRadius: "var(--radius-sm)",
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
              style={{
                padding: "10px 12px",
                background: "var(--surface-2)",
                borderRadius: "var(--radius-sm)",
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
