import type { Clinic } from "@prisma/client";
import { addPatientAction } from "@/lib/actions/receptionist";
import { WeekSlotPicker } from "./WeekSlotPicker";
import {
  PlusCircleIcon,
  SearchIcon,
  StethoscopeIcon,
} from "../DashboardIcons";

interface BookingTabProps {
  clinic: Clinic;
  allDoctors: Array<any>;
  patientQuery: string;
  patientResults: Array<any>;
  selectedDoctorId: string;
  selectedPatientName: string;
  selectedPatientPhone: string;
  week: Array<any>;
  weekStart: Date;
  nextWeekStart: Date;
  prevWeekStart: Date;
  canGoBack: boolean;
  timeZone: string;
  now: Date;
  slotQueryFn: (params: {
    doctorId: string;
    patientName: string;
    patientPhone: string;
    week?: string;
  }) => string;
  params: Record<string, any>;
}

export function BookingTab({
  clinic,
  allDoctors,
  patientQuery,
  patientResults,
  selectedDoctorId,
  selectedPatientName,
  selectedPatientPhone,
  week,
  weekStart,
  nextWeekStart,
  prevWeekStart,
  canGoBack,
  timeZone,
  now,
  slotQueryFn,
  params,
}: BookingTabProps) {
  const activeDoctors = allDoctors.filter((d) => d.active);
  const hasSelectedPatient = Boolean(selectedPatientPhone);

  return (
    <div style={{ maxWidth: "760px", margin: "0 auto" }}>
      <div className="card" id="find-patient" style={{ marginBottom: 20 }}>
        <h2 className="card-title-icon">
          <SearchIcon /> Step 1 · Find or add a patient
        </h2>
        <form method="get" action="/receptionist?tab=booking#find-patient" className="stack" style={{ marginBottom: 4 }}>
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
                          href={slotQueryFn({
                            doctorId: "",
                            patientName: p.name ?? "",
                            patientPhone: p.phone,
                          })}
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
            ({selectedPatientPhone}) · <a href="/receptionist?tab=booking#assign-doctor">choose a different patient</a>
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
            <form method="get" action="/receptionist?tab=booking#assign-doctor" style={{ marginBottom: 16, marginTop: 12 }}>
              <input type="hidden" name="tab" value="booking" />
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
                        ? slotQueryFn({
                            doctorId: selectedDoctorId,
                            patientName: selectedPatientName,
                            patientPhone: selectedPatientPhone,
                            week: prevWeekStart.toISOString().split("T")[0],
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
                    href={slotQueryFn({
                      doctorId: selectedDoctorId,
                      patientName: selectedPatientName,
                      patientPhone: selectedPatientPhone,
                      week: nextWeekStart.toISOString().split("T")[0],
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
                  days={week.map((day: any) => ({
                    label: day.date.toLocaleDateString(undefined, { weekday: "short", timeZone }),
                    sub: day.date.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone }),
                    slots: day.slots.map((slot: any) => ({
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
  );
}
