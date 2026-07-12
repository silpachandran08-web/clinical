import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getClinic } from "@/src/adminHandlers";
import {
  calculateAge,
  countCompletedToday,
  formatDayParam,
  formatMonthParam,
  getDayParam,
  getMonthStart,
  getMyDepartmentId,
  isFlowStageDepartment,
  listAppointmentDayCounts,
  listDayAppointments,
  listMyQueue,
  listStageQueue,
  searchMyPatients,
  shiftMonthParam,
} from "@/src/doctorHandlers";
import { startOfDayInTimezone } from "@/src/scheduling/timezone";
import {
  advanceStageAction,
  completeConsultationAction,
  startConsultationAction,
  startNextConsultationAction,
} from "@/lib/actions/doctor";
import { PrescriptionBuilder } from "./PrescriptionBuilder";
import { AdministeredTreatmentBuilder } from "./AdministeredTreatmentBuilder";
import { MonthCalendar } from "./MonthCalendar";
import { AutoRefresh } from "../AutoRefresh";
import {
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  PatientIcon,
  PrinterIcon,
  ScaleIcon,
  SearchIcon,
  StethoscopeIcon,
  SyringeIcon,
} from "../DashboardIcons";

export default async function DoctorQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; month?: string; day?: string; justCompleted?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "DOCTOR" || !session.doctorId) redirect("/login");

  const params = await searchParams;
  const q = params.q ?? "";

  const clinic = await getClinic(session.clinicId);
  const monthStart = getMonthStart(params.month, clinic.timezone);
  const selectedDay = params.day ? getDayParam(params.day, clinic.timezone) : null;
  const isPastDay = selectedDay ? selectedDay.getTime() < startOfDayInTimezone(new Date(), clinic.timezone).getTime() : false;

  const myDepartmentId = await getMyDepartmentId(session.clinicId, session.doctorId);
  const isStageDept = await isFlowStageDepartment(session.clinicId, myDepartmentId);

  const [queue, completedToday, searchResults, dayCounts, dayAppointments, stageQueue] = await Promise.all([
    listMyQueue(session.clinicId, session.doctorId, clinic.timezone),
    countCompletedToday(session.clinicId, session.doctorId, clinic.timezone),
    q ? searchMyPatients(session.clinicId, session.doctorId, q) : Promise.resolve([]),
    listAppointmentDayCounts(session.clinicId, session.doctorId, monthStart, clinic.timezone),
    selectedDay
      ? listDayAppointments(session.clinicId, session.doctorId, selectedDay, clinic.timezone)
      : Promise.resolve([]),
    isStageDept ? listStageQueue(session.clinicId, myDepartmentId, clinic.timezone) : Promise.resolve([]),
  ]);

  const waiting = queue.filter((a) => a.status === "CHECKED_IN");
  const current = queue.find((a) => a.status === "IN_PROGRESS");
  const now = new Date();

  const GENDER_ABBR: Record<string, string> = { MALE: "M", FEMALE: "F", OTHER: "O" };
  const currentAge = current ? calculateAge(current.patient.birthYear) : null;
  const currentGender = current?.patient.gender ? GENDER_ABBR[current.patient.gender] : null;
  const currentDemographics = [currentAge, currentGender].filter(Boolean).join(", ");

  const baseQuery = new URLSearchParams();
  if (params.month) baseQuery.set("month", params.month);
  if (params.day) baseQuery.set("day", params.day);
  const clearSearchHref = `/doctor${baseQuery.toString() ? `?${baseQuery.toString()}` : ""}`;

  return (
    <div>
      <AutoRefresh />
      <div className="page-header">
        <h1>Today&apos;s queue</h1>
        <span className="date">
          {now.toLocaleDateString(undefined, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            timeZone: clinic.timezone,
          })}
        </span>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card-icon"><ClockIcon /></div>
          <div className="stat-value">{waiting.length}</div>
          <div className="stat-label">Waiting</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon"><CheckCircleIcon /></div>
          <div className="stat-value">{current ? 1 : 0}</div>
          <div className="stat-label">In consultation</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon"><CalendarIcon /></div>
          <div className="stat-value">{completedToday}</div>
          <div className="stat-label">Completed today</div>
        </div>
      </div>

      <div className="dashboard-layout">
        <div className="dashboard-main">
          {params.justCompleted && (
            <div className="card" style={{ borderColor: "var(--success)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <p style={{ margin: 0, color: "var(--success)" }} className="card-title-icon">
                <CheckCircleIcon size={16} /> Visit completed.
              </p>
              <a className="btn-link" href={`/doctor/consultations/${params.justCompleted}/print`} target="_blank" rel="noreferrer">
                <PrinterIcon size={15} /> Print prescription
              </a>
            </div>
          )}

          {current && (
            <div className="card" style={{ borderColor: "var(--accent)" }}>
              <h2 className="card-title-icon">
                <StethoscopeIcon />
                In progress: {current.patient.name ?? current.patient.phone}
                {currentDemographics && <span className="muted"> ({currentDemographics})</span>}
              </h2>
              <p className="muted">
                Slot{" "}
                {current.slot.startsAt.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: clinic.timezone,
                })}{" "}
                ·{" "}
                <Link href={`/doctor/patients/${current.patient.id}`}>
                  {currentDemographics ? "View patient history" : "Add patient details →"}
                </Link>
              </p>
              <form action={completeConsultationAction} className="stack" style={{ maxWidth: 560 }}>
                <input type="hidden" name="appointmentId" value={current.id} />
                <label>
                  Notes
                  <textarea name="notes" placeholder="Consultation notes — history, examination, diagnosis…" rows={6} />
                </label>
                <label className="card-title-icon" style={{ marginBottom: -4, flexDirection: "row", alignItems: "center" }}>
                  <ScaleIcon size={15} /> Weight (kg)
                </label>
                <input name="weightKg" type="number" step="0.1" min={0} placeholder="e.g. 72.5" style={{ maxWidth: 160 }} />
                <label>Prescription (take home)</label>
                <PrescriptionBuilder fieldName="prescription" />
                <label className="card-title-icon" style={{ marginBottom: -4, flexDirection: "row", alignItems: "center" }}>
                  <SyringeIcon size={15} /> Administered at clinic today
                </label>
                <AdministeredTreatmentBuilder fieldName="administeredTreatment" />
                <label>
                  Ask patient to return in (days, optional)
                  <input name="followUpDays" type="number" min={1} placeholder="e.g. 14" />
                </label>
                <button type="submit">Complete visit</button>
              </form>
            </div>
          )}

          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h2 className="card-title-icon" style={{ margin: 0 }}>
                <ClockIcon /> Waiting
              </h2>
              {!current && waiting.length > 0 && (
                <form action={startNextConsultationAction}>
                  <button type="submit">Call next patient →</button>
                </form>
              )}
            </div>
            {waiting.length === 0 ? (
              <p className="empty-state">
                {current ? "No one else waiting." : "No patients checked in yet."}
              </p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Patient</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {waiting.map((a, i) => (
                    <tr key={a.id}>
                      <td>
                        {a.slot.startsAt.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: clinic.timezone,
                        })}
                      </td>
                      <td>
                        {a.patient.name ?? a.patient.phone}
                        {i === 0 && <span className="badge" style={{ marginLeft: 6 }}>next up</span>}
                      </td>
                      <td>
                        {!current && (
                          <form action={startConsultationAction}>
                            <input type="hidden" name="appointmentId" value={a.id} />
                            <button type="submit" className="secondary">
                              Start this one
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {isStageDept && (
            <div className="card">
              <h2 className="card-title-icon" style={{ marginBottom: 2 }}>
                <StethoscopeIcon /> Stage queue
              </h2>
              <p className="muted" style={{ marginTop: 0, marginBottom: 14, fontSize: 12.5 }}>
                Shared — any staff in your department can pick these up.
              </p>
              {stageQueue.length === 0 ? (
                <p className="empty-state">No one waiting at this stage.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Patient</th>
                      <th>For doctor</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {stageQueue.map((a) => (
                      <tr key={a.id}>
                        <td>
                          {a.slot.startsAt.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: clinic.timezone,
                          })}
                        </td>
                        <td>{a.patient.name ?? a.patient.phone}</td>
                        <td>{a.doctor.name}</td>
                        <td>
                          <form action={advanceStageAction}>
                            <input type="hidden" name="appointmentId" value={a.id} />
                            <button type="submit" className="secondary">
                              Send to next stage →
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {selectedDay && (
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <h2 className="card-title-icon" style={{ margin: 0 }}>
                  <CalendarIcon />
                  {isPastDay ? "Visited" : "Scheduled"} —{" "}
                  {selectedDay.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", timeZone: clinic.timezone })}
                </h2>
                <a href={`/doctor?month=${formatMonthParam(monthStart, clinic.timezone)}`} className="muted" style={{ fontSize: 12.5 }}>
                  ✕ Clear
                </a>
              </div>
              {dayAppointments.length === 0 ? (
                <p className="empty-state">
                  {isPastDay ? "No appointments on this day." : "No appointments scheduled."}
                </p>
              ) : (
                <div className="appt-table no-channel">
                  {dayAppointments.map((a) => (
                    <div className="appt-row" key={a.id}>
                      <span className="appt-time">
                        {a.slot.startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: clinic.timezone })}
                      </span>
                      <span className="appt-patient">
                        <PatientIcon size={14} />
                        <Link href={`/doctor/patients/${a.patient.id}`} className="appt-patient-name">
                          {a.patient.name ?? a.patient.phone}
                        </Link>
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
                      {a.status === "COMPLETED" && a.consultation && (
                        <div className="appt-footer">
                          <span />
                          <a
                            className="btn-link"
                            href={`/doctor/consultations/${a.consultation.id}/print`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <PrinterIcon size={13} /> Print
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <aside className="dashboard-sidebar">
          <div className="card">
            <h2 className="card-title-icon">
              <CalendarIcon /> My calendar
            </h2>
            <MonthCalendar
              monthStart={monthStart}
              today={now}
              dayCounts={dayCounts}
              timeZone={clinic.timezone}
              prevMonthHref={`/doctor?month=${shiftMonthParam(monthStart, -1, clinic.timezone)}`}
              nextMonthHref={`/doctor?month=${shiftMonthParam(monthStart, 1, clinic.timezone)}`}
              dayHref={(key) =>
                key === params.day
                  ? `/doctor?month=${formatMonthParam(monthStart, clinic.timezone)}`
                  : `/doctor?month=${formatMonthParam(monthStart, clinic.timezone)}&day=${key}`
              }
              selectedDayKey={params.day}
            />
          </div>

          <div className="card">
            <h2 className="card-title-icon">
              <SearchIcon /> Search patients
            </h2>
            <form method="get" className="stack" style={{ marginBottom: 4, maxWidth: "none" }}>
              <label>
                Name, phone, or email
                <input name="q" defaultValue={q} placeholder="Search all patients" />
              </label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button type="submit" className="secondary" style={{ alignSelf: "flex-start" }}>
                  <SearchIcon size={15} /> Search
                </button>
                {q && (
                  <a href={clearSearchHref} className="btn-link">
                    ✕ Clear
                  </a>
                )}
              </div>
            </form>

            {q && (
              <div style={{ marginTop: 16 }}>
                {searchResults.length === 0 ? (
                  <p className="empty-state">No patients match &quot;{q}&quot;.</p>
                ) : (
                  <div className="schedule-list">
                    {searchResults.map((p) => (
                      <div className="schedule-row" key={p.id} style={{ padding: "8px 0" }}>
                        <div className="schedule-info">
                          <div className="schedule-patient">
                            <PatientIcon size={14} />
                            <span>{p.name ?? p.phone}</span>
                          </div>
                          <div className="muted" style={{ fontSize: 11.5 }}>{p.phone}</div>
                        </div>
                        <Link href={`/doctor/patients/${p.id}`}>History →</Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
