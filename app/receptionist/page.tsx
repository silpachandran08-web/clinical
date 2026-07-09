import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getClinic, listDoctors } from "@/src/adminHandlers";
import {
  formatDayParam,
  formatWeekParam,
  getDayParam,
  getWeekStart,
  listDoctorsStatusForDay,
  listOpenEscalations,
  listTodayAppointments,
  listWeekSlots,
  searchPatients,
} from "@/src/receptionistHandlers";
import { addPatientAction, checkInAction, resolveEscalationAction } from "@/lib/actions/receptionist";
import { WeekSlotPicker } from "./WeekSlotPicker";
import { AutoRefresh } from "../AutoRefresh";
import {
  AlertIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  PatientIcon,
  PlusCircleIcon,
  SearchIcon,
  StethoscopeIcon,
} from "../DashboardIcons";

const DAY_MS = 24 * 60 * 60 * 1000;

type ReceptionistParams = {
  doctorId?: string;
  error?: string;
  booked?: string;
  patientQuery?: string;
  added?: string;
  patientName?: string;
  patientPhone?: string;
  week?: string;
  statusDay?: string;
};

function slotQuery(params: {
  doctorId: string;
  patientName: string;
  patientPhone: string;
  week?: string;
}) {
  const q = new URLSearchParams();
  q.set("doctorId", params.doctorId);
  if (params.patientName) q.set("patientName", params.patientName);
  if (params.patientPhone) q.set("patientPhone", params.patientPhone);
  if (params.week) q.set("week", params.week);
  return `/receptionist?${q.toString()}#assign-doctor`;
}

function dayNavQuery(current: ReceptionistParams, statusDay: string) {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(current)) {
    if (value && key !== "statusDay") q.set(key, value);
  }
  q.set("statusDay", statusDay);
  return `/receptionist?${q.toString()}#doctor-availability`;
}

export default async function ReceptionistPage({
  searchParams,
}: {
  searchParams: Promise<ReceptionistParams>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await searchParams;

  const clinic = await getClinic(session.clinicId);
  const timeZone = clinic.timezone;

  const today = getDayParam(undefined, timeZone);
  const statusDay = getDayParam(params.statusDay, timeZone);
  const isToday = statusDay.getTime() === today.getTime();
  const prevDay = new Date(statusDay.getTime() - DAY_MS);
  const nextDay = new Date(statusDay.getTime() + DAY_MS);
  const canGoBackDay = statusDay > today;

  const [appointments, todayDoctorStatus, browsedDoctorStatus, allDoctors, escalations] = await Promise.all([
    listTodayAppointments(session.clinicId, timeZone),
    listDoctorsStatusForDay(session.clinicId, today),
    isToday ? Promise.resolve(null) : listDoctorsStatusForDay(session.clinicId, statusDay),
    listDoctors(session.clinicId),
    listOpenEscalations(session.clinicId),
  ]);
  const doctorStatus = browsedDoctorStatus ?? todayDoctorStatus;

  const activeDoctors = allDoctors.filter((d) => d.active);
  const selectedDoctorId = params.doctorId ?? "";

  const weekStart = getWeekStart(params.week, timeZone);
  const prevWeekStart = new Date(weekStart.getTime() - 7 * DAY_MS);
  const nextWeekStart = new Date(weekStart.getTime() + 7 * DAY_MS);
  const thisWeekStart = getWeekStart(undefined, timeZone);
  const canGoBack = weekStart > thisWeekStart;

  const week = selectedDoctorId ? await listWeekSlots(session.clinicId, selectedDoctorId, weekStart) : [];

  const patientQuery = params.patientQuery ?? "";
  const patientResults = patientQuery ? await searchPatients(session.clinicId, patientQuery) : [];

  const selectedPatientName = params.patientName ?? "";
  const selectedPatientPhone = params.patientPhone ?? "";
  const hasSelectedPatient = Boolean(selectedPatientPhone);

  const waitingCount = todayDoctorStatus.reduce((sum, d) => sum + d.waiting.length, 0);
  const inProgressCount = todayDoctorStatus.filter((d) => d.inProgressWith).length;
  const now = new Date();

  return (
    <div>
      <AutoRefresh />
      <div className="page-header">
        <h1>Today</h1>
        <span className="date">
          {now.toLocaleDateString(undefined, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            timeZone,
          })}
        </span>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card-icon"><StethoscopeIcon /></div>
          <div className="stat-value">{todayDoctorStatus.length}</div>
          <div className="stat-label">Doctors active</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon"><CalendarIcon /></div>
          <div className="stat-value">{appointments.length}</div>
          <div className="stat-label">Appointments today</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon"><CheckCircleIcon /></div>
          <div className="stat-value">{inProgressCount}</div>
          <div className="stat-label">In consultation</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon"><ClockIcon /></div>
          <div className="stat-value">{waitingCount}</div>
          <div className="stat-label">Waiting</div>
        </div>
      </div>

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
                ))}
              </div>
            </div>
          )}

          <div className="card" id="find-patient">
            <h2 className="card-title-icon">
              <SearchIcon /> Step 1 · Find or add a patient
            </h2>
            <form method="get" action="/receptionist#find-patient" className="stack" style={{ marginBottom: 4 }}>
              <label>
                Search by name, phone, or email
                <input name="patientQuery" defaultValue={patientQuery} placeholder="e.g. +9665... or jane@example.com" />
              </label>
              <button type="submit" className="secondary" style={{ alignSelf: "flex-start" }}>
                <SearchIcon size={15} /> Search
              </button>
            </form>

            {patientQuery && (
              <div style={{ marginTop: 16 }}>
                {patientResults.length === 0 ? (
                  <p className="empty-state">No existing patient matches &quot;{patientQuery}&quot;. Add them below.</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Email</th>
                        <th>Visits</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {patientResults.map((p) => (
                        <tr key={p.id}>
                          <td>{p.name ?? "—"}</td>
                          <td>{p.phone}</td>
                          <td>{p.email ?? "—"}</td>
                          <td>{p._count.appointments}</td>
                          <td>
                            <a
                              className="btn-link"
                              href={`/receptionist?patientName=${encodeURIComponent(
                                p.name ?? "",
                              )}&patientPhone=${encodeURIComponent(p.phone)}#assign-doctor`}
                            >
                              Assign a doctor →
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            <hr className="divider" />

            <h2 className="card-title-icon" style={{ fontSize: 13, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              <PlusCircleIcon size={15} /> Add a new patient
            </h2>
            <form action={addPatientAction} className="stack">
              <label>
                Name
                <input name="name" required />
              </label>
              <label>
                Phone
                <input name="phone" placeholder="+9665XXXXXXXX" required />
              </label>
              <label>
                Email (optional)
                <input name="email" type="email" placeholder="jane@example.com" />
              </label>
              <button type="submit" className="secondary" style={{ alignSelf: "flex-start" }}>
                Save &amp; assign a doctor →
              </button>
            </form>
          </div>

          <div className="card" id="assign-doctor">
            <h2 className="card-title-icon">
              <StethoscopeIcon /> Step 2 · Assign a doctor
            </h2>

            {hasSelectedPatient ? (
              <p className="muted">
                Booking for <strong style={{ color: "var(--text)" }}>{selectedPatientName || selectedPatientPhone}</strong>{" "}
                ({selectedPatientPhone}) ·{" "}
                <a href="/receptionist#assign-doctor">choose a different patient</a>
              </p>
            ) : (
              <p className="muted">Find or add a patient above first — then pick a doctor and an open slot below.</p>
            )}

            {params.added === "1" && <p style={{ color: "var(--success)" }}>Patient saved.</p>}
            {params.error === "missing" && <p className="error">Something went wrong — try picking the slot again.</p>}
            {params.booked === "1" && (
              <p style={{ color: "var(--success)" }}>Appointment booked — the doctor will see them once checked in.</p>
            )}

            {hasSelectedPatient && (
              <>
                <form method="get" action="/receptionist#assign-doctor" style={{ marginBottom: 16, marginTop: 12 }}>
                  <input type="hidden" name="patientName" value={selectedPatientName} />
                  <input type="hidden" name="patientPhone" value={selectedPatientPhone} />
                  <label>
                    Doctor
                    <select name="doctorId" defaultValue={selectedDoctorId}>
                      <option value="">Choose a doctor</option>
                      {activeDoctors.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} — {d.department.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="submit" className="secondary" style={{ marginTop: 8 }}>
                    Show availability
                  </button>
                </form>

                {selectedDoctorId && (
                  <div>
                    <div className="week-nav">
                      <a
                        href={
                          canGoBack
                            ? slotQuery({
                                doctorId: selectedDoctorId,
                                patientName: selectedPatientName,
                                patientPhone: selectedPatientPhone,
                                week: formatWeekParam(prevWeekStart, timeZone),
                              })
                            : undefined
                        }
                        aria-disabled={!canGoBack}
                        style={!canGoBack ? { color: "var(--text-muted)", pointerEvents: "none" } : undefined}
                      >
                        ← Previous week
                      </a>
                      <span className="range">
                        {weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone })} –{" "}
                        {nextWeekStart.toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          timeZone,
                        })}
                      </span>
                      <a
                        href={slotQuery({
                          doctorId: selectedDoctorId,
                          patientName: selectedPatientName,
                          patientPhone: selectedPatientPhone,
                          week: formatWeekParam(nextWeekStart, timeZone),
                        })}
                      >
                        Next week →
                      </a>
                    </div>

                    <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
                      <span className="slot-btn open" style={{ marginRight: 6, cursor: "default" }}>
                        green
                      </span>
                      open — click to select &nbsp;·&nbsp;
                      <span className="slot-btn booked" style={{ marginLeft: 6, cursor: "default" }}>
                        red
                      </span>
                      already taken &nbsp;·&nbsp;
                      <span className="slot-btn past" style={{ marginLeft: 6, cursor: "default" }}>
                        gray
                      </span>
                      already past
                    </p>

                    <WeekSlotPicker
                      doctorId={selectedDoctorId}
                      patientName={selectedPatientName}
                      patientPhone={selectedPatientPhone}
                      days={week.map((day) => ({
                        label: day.date.toLocaleDateString(undefined, { weekday: "short", timeZone }),
                        sub: day.date.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone }),
                        slots: day.slots.map((slot) => ({
                          id: slot.id,
                          status: slot.status,
                          time: slot.startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone }),
                          isPast: slot.startsAt.getTime() < now.getTime(),
                        })),
                      }))}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <aside className="dashboard-sidebar">
          <div className="card" id="doctor-availability" style={{ overflow: "visible" }}>
            <div className="week-nav" style={{ marginTop: 0, marginBottom: 14 }}>
              <a
                href={canGoBackDay ? dayNavQuery(params, formatDayParam(prevDay, timeZone)) : undefined}
                style={!canGoBackDay ? { color: "var(--text-muted)", pointerEvents: "none" } : undefined}
              >
                ← Prev
              </a>
              <span className="range">
                {isToday
                  ? "Today"
                  : statusDay.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", timeZone })}
              </span>
              <a href={dayNavQuery(params, formatDayParam(nextDay, timeZone))}>Next →</a>
            </div>

            <h2 className="card-title-icon">
              <StethoscopeIcon /> Doctor availability
            </h2>
            {doctorStatus.length === 0 ? (
              <p className="empty-state">No active doctors yet.</p>
            ) : (
              <div className="doctor-availability-list">
                {doctorStatus.map((d) => (
                  <div className="doctor-availability-row" key={d.id}>
                    <div className="doctor-availability-name">
                      <StethoscopeIcon size={15} />
                      <span className="doctor-name-text">{d.name}</span>
                      {isToday && (
                        <span
                          className={`availability-dot ${d.isLive ? "available" : "unavailable"}`}
                          title={d.isLive ? "Available" : "Unavailable"}
                        />
                      )}
                    </div>
                    {isToday && (
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
                    )}
                    <div>
                      {d.totalSlots === 0 ? (
                        <span className="muted">Not working this day</span>
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
                              {d.openSlots.slice(0, 16).map((s) => (
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
    </div>
  );
}
