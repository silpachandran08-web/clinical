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

  return (
    <div className="dashboard-layout">
      <div className="dashboard-main">
        {escalations.length > 0 && (
          <div className="card" style={{ borderColor: "var(--warning)" }}>
            <h2 className="card-title-icon">
              <AlertIcon /> Patient follow-ups
              <span className="badge warning">{escalations.length}</span>
            </h2>
            <p className="muted" style={{ margin: "0 0 12px", fontSize: 12.5 }}>
              The WhatsApp assistant asked staff to take over these chats — reply to the patient, then mark it handled.
            </p>
            <div className="escalation-list">
              {escalations.map((e) => (
                <div className="escalation-row" key={e.id}>
                  <div className="escalation-row-top">
                    <div className="escalation-info">
                      <div className="schedule-patient">
                        <PatientIcon size={14} />
                        <span>{e.patientName ?? e.patientPhone}</span>
                        {e.urgent && <span className="badge danger">URGENT</span>}
                        <span className="muted" style={{ fontSize: 11.5, fontWeight: 500 }}>
                          {e.createdAt.toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone,
                          })}
                        </span>
                      </div>
                      <div className="muted" style={{ fontSize: 12.5, paddingLeft: 20 }}>
                        {e.reason}
                        {e.patientName && <> · {e.patientPhone}</>}
                      </div>
                    </div>
                    <div className="escalation-actions">
                      <a
                        className="btn-link"
                        href={`https://wa.me/${e.patientPhone.replace("+", "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Reply on WhatsApp
                      </a>
                      <form action={resolveEscalationAction}>
                        <input type="hidden" name="escalationId" value={e.id} />
                        <button type="submit" className="secondary">
                          Mark handled
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
      </div>

      <aside className="dashboard-sidebar">
        <div className="card" id="doctor-availability" style={{ overflow: "visible", marginBottom: 0 }}>
          <h2 className="card-title-icon" style={{ marginBottom: 14 }}>
            <StethoscopeIcon /> Doctor Availability
          </h2>
          {todayDoctorStatus.length === 0 ? (
            <p className="empty-state">No active doctors yet.</p>
          ) : (
            <div className="doctor-availability-list">
              {todayDoctorStatus.map((d) => (
                <div className="doctor-availability-row" key={d.id}>
                  <div className="doctor-availability-name">
                    <StethoscopeIcon size={15} />
                    <span className="doctor-name-text">{d.name}</span>
                    <span
                      className={`availability-dot ${d.isLive ? "available" : "unavailable"}`}
                      title={d.isLive ? "Available" : "Unavailable"}
                    />
                  </div>
                  <div className="doctor-availability-live">
                    {d.inProgressWith ? (
                      <span className="badge success">
                        With {d.inProgressWith.patient.name ?? d.inProgressWith.patient.phone}
                      </span>
                    ) : (
                      <span className="muted">Free</span>
                    )}
                    {d.waiting.length > 0 && <span className="badge warning">{d.waiting.length} waiting</span>}
                  </div>
                  <div>
                    {d.totalSlots === 0 ? (
                      <span className="muted">Not working today</span>
                    ) : d.dayEnded ? (
                      <span className="muted">Day closed</span>
                    ) : d.openSlots.length === 0 ? (
                      <span className="badge danger">Fully booked</span>
                    ) : (
                      <div className="slot-tooltip">
                        <div>
                          <span className="badge success">{d.openSlots.length} open slots</span>
                          <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>
                            Next available{" "}
                            {d.openSlots[0].startsAt.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              timeZone,
                            })}
                          </div>
                        </div>
                        <div className="slot-tooltip-panel">
                          <div className="slot-tooltip-title">Open times today</div>
                          <div className="slot-tooltip-times">
                            {d.openSlots.slice(0, 16).map((s: any) => (
                              <span key={s.id} className="slot-tooltip-chip">
                                {s.startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone })}
                              </span>
                            ))}
                            {d.openSlots.length > 16 && (
                              <span className="muted" style={{ fontSize: 11 }}>
                                +{d.openSlots.length - 16} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="card-title-icon">
            <CalendarIcon /> Today&apos;s schedule
          </h2>
          {appointments.length === 0 ? (
            <p className="empty-state">No appointments today.</p>
          ) : (
            <div className="appt-table">
              {appointments.map((a) => (
                <div className="appt-row" key={a.id}>
                  <span className="appt-time">
                    {a.slot.startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone })}
                  </span>
                  <span className="appt-patient">
                    <PatientIcon size={14} />
                    <span className="appt-patient-name">{a.patient.name ?? a.patient.phone}</span>
                  </span>
                  <span>
                    {a.bookedByStaff ? (
                      <span className="badge">walk-in</span>
                    ) : (
                      <span className="badge info">online</span>
                    )}
                  </span>
                  <span className="appt-status">
                    <span
                      className={`badge ${
                        a.status === "CANCELLED" || a.status === "NO_SHOW"
                          ? "danger"
                          : a.status === "COMPLETED"
                            ? "success"
                            : ""
                      }`}
                    >
                      {a.status}
                    </span>
                  </span>
                  <div className="appt-footer">
                    <span className="appt-doctor">{a.doctor.name}</span>
                    <span>
                      {a.status === "CONFIRMED" && (
                        <form action={checkInAction}>
                          <input type="hidden" name="appointmentId" value={a.id} />
                          <button type="submit" className="secondary">
                            Check in
                          </button>
                        </form>
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
