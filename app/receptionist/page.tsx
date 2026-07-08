import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listDoctors } from "@/src/adminHandlers";
import {
  formatWeekParam,
  getWeekStart,
  listDoctorsWithTodayStatus,
  listTodayAppointments,
  listWeekSlots,
  searchPatients,
} from "@/src/receptionistHandlers";
import { addPatientAction, bookWalkInAction, checkInAction } from "@/lib/actions/receptionist";

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

export default async function ReceptionistPage({
  searchParams,
}: {
  searchParams: Promise<{
    doctorId?: string;
    error?: string;
    booked?: string;
    patientQuery?: string;
    added?: string;
    patientName?: string;
    patientPhone?: string;
    week?: string;
  }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await searchParams;

  const [appointments, doctorStatus, allDoctors] = await Promise.all([
    listTodayAppointments(session.clinicId),
    listDoctorsWithTodayStatus(session.clinicId),
    listDoctors(session.clinicId),
  ]);

  const activeDoctors = allDoctors.filter((d) => d.active);
  const selectedDoctorId = params.doctorId ?? "";

  const weekStart = getWeekStart(params.week);
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const nextWeekStart = new Date(weekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);
  const thisWeekStart = getWeekStart();
  const canGoBack = weekStart > thisWeekStart;

  const week = selectedDoctorId ? await listWeekSlots(session.clinicId, selectedDoctorId, weekStart) : [];

  const patientQuery = params.patientQuery ?? "";
  const patientResults = patientQuery ? await searchPatients(session.clinicId, patientQuery) : [];

  const selectedPatientName = params.patientName ?? "";
  const selectedPatientPhone = params.patientPhone ?? "";
  const hasSelectedPatient = Boolean(selectedPatientPhone);

  const waitingCount = doctorStatus.reduce((sum, d) => sum + d.waiting.length, 0);
  const inProgressCount = doctorStatus.filter((d) => d.inProgressWith).length;
  const now = new Date();

  return (
    <div>
      <div className="page-header">
        <h1>Today</h1>
        <span className="date">
          {now.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </span>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">{doctorStatus.length}</div>
          <div className="stat-label">Doctors active</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{appointments.length}</div>
          <div className="stat-label">Appointments today</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{inProgressCount}</div>
          <div className="stat-label">In consultation</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{waitingCount}</div>
          <div className="stat-label">Waiting</div>
        </div>
      </div>

      <div className="card">
        <h2>Doctor status</h2>
        {doctorStatus.length === 0 ? (
          <p className="empty-state">No active doctors yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Doctor</th>
                <th>Right now</th>
                <th>Waiting</th>
              </tr>
            </thead>
            <tbody>
              {doctorStatus.map((d) => (
                <tr key={d.id}>
                  <td>{d.name}</td>
                  <td>
                    {d.inProgressWith ? (
                      <span className="badge success">
                        With {d.inProgressWith.patient.name ?? d.inProgressWith.patient.phone}
                      </span>
                    ) : (
                      <span className="muted">Free</span>
                    )}
                  </td>
                  <td>{d.waiting.length > 0 ? `${d.waiting.length} waiting` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2>Step 1 · Find or add a patient</h2>
        <form method="get" className="stack" style={{ marginBottom: 4 }}>
          <label>
            Search by name, phone, or email
            <input name="patientQuery" defaultValue={patientQuery} placeholder="e.g. +9665... or jane@example.com" />
          </label>
          <button type="submit" className="secondary" style={{ alignSelf: "flex-start" }}>
            Search
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

        <h2 style={{ fontSize: 13, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
          Add a new patient
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
        <h2>Step 2 · Assign a doctor</h2>

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
            <form method="get" style={{ marginBottom: 16, marginTop: 12 }}>
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
                            week: formatWeekParam(prevWeekStart),
                          })
                        : undefined
                    }
                    aria-disabled={!canGoBack}
                    style={!canGoBack ? { color: "var(--text-muted)", pointerEvents: "none" } : undefined}
                  >
                    ← Previous week
                  </a>
                  <span className="range">
                    {weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} –{" "}
                    {nextWeekStart.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <a
                    href={slotQuery({
                      doctorId: selectedDoctorId,
                      patientName: selectedPatientName,
                      patientPhone: selectedPatientPhone,
                      week: formatWeekParam(nextWeekStart),
                    })}
                  >
                    Next week →
                  </a>
                </div>

                <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
                  <span className="slot-btn open" style={{ marginRight: 6, cursor: "default" }}>
                    green
                  </span>
                  open — click to book &nbsp;·&nbsp;
                  <span className="slot-btn booked" style={{ marginLeft: 6, cursor: "default" }}>
                    red
                  </span>
                  already taken
                </p>

                {week.map((day) => (
                  <div className="day-row" key={day.date.toISOString()}>
                    <div className="day-label">
                      {day.date.toLocaleDateString(undefined, { weekday: "short" })}
                      <span className="day-sub">
                        {day.date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <div className="slot-list">
                      {day.slots.length === 0 ? (
                        <span className="muted" style={{ fontSize: 12.5 }}>
                          Not working this day
                        </span>
                      ) : (
                        day.slots.map((slot) =>
                          slot.status === "OPEN" ? (
                            <form action={bookWalkInAction} key={slot.id}>
                              <input type="hidden" name="doctorId" value={selectedDoctorId} />
                              <input type="hidden" name="slotId" value={slot.id} />
                              <input type="hidden" name="patientName" value={selectedPatientName} />
                              <input type="hidden" name="patientPhone" value={selectedPatientPhone} />
                              <button type="submit" className="slot-btn open">
                                {slot.startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </button>
                            </form>
                          ) : (
                            <span className="slot-btn booked" key={slot.id}>
                              {slot.startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          ),
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="card">
        <h2>Today&apos;s schedule</h2>
        {appointments.length === 0 ? (
          <p className="empty-state">No appointments today.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a.id}>
                  <td>{a.slot.startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                  <td>
                    {a.patient.name ?? a.patient.phone}
                    {a.bookedByStaff && <span className="badge" style={{ marginLeft: 6 }}>walk-in</span>}
                  </td>
                  <td>{a.doctor.name}</td>
                  <td>
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
                  </td>
                  <td>
                    {a.status === "CONFIRMED" && (
                      <form action={checkInAction}>
                        <input type="hidden" name="appointmentId" value={a.id} />
                        <button type="submit" className="secondary">
                          Check in
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
    </div>
  );
}
