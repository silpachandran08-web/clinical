"use client";

import { useEffect, useState, useTransition } from "react";
import { listActiveDoctorsAction, listWeekSlotsAction, rescheduleAppointmentAction } from "@/lib/actions/receptionist";
import { getDatePartsInTimezone, zonedTimeToUtc } from "@/src/scheduling/timezone";
import { WeekSlotPicker } from "./WeekSlotPicker";

const DAY_MS = 24 * 60 * 60 * 1000;

function weekStartOf(date: Date, timeZone: string): Date {
  const parts = getDatePartsInTimezone(date, timeZone);
  const dayStart = zonedTimeToUtc(parts.year, parts.month, parts.day, 0, 0, timeZone);
  const weekday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
  return new Date(dayStart.getTime() - weekday * DAY_MS);
}

interface Doctor {
  id: string;
  name: string;
  active: boolean;
  department: { name: string };
}

interface Appointment {
  id: string;
  doctorId: string;
  doctor: { name: string };
  patient: { name: string | null; phone: string };
  slot: { startsAt: Date };
}

export function EditAppointmentModal({ appointment, timeZone }: { appointment: Appointment; timeZone: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState(appointment.doctorId);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => weekStartOf(appointment.slot.startsAt, timeZone));
  const [displayWeek, setDisplayWeek] = useState<Array<any>>([]);
  const [isLoading, startLoading] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const thisWeekStart = weekStartOf(new Date(), timeZone);
  const canGoBack = currentWeekStart > thisWeekStart;

  function loadWeek(doctorId: string, weekStart: Date) {
    startLoading(async () => {
      try {
        const week = await listWeekSlotsAction(doctorId, weekStart.toISOString());
        setDisplayWeek(week);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load slots — try again");
      }
    });
  }

  function handleOpen() {
    setIsOpen(true);
    setError(null);
    if (doctors.length === 0) {
      startLoading(async () => {
        try {
          const list = await listActiveDoctorsAction();
          setDoctors(list);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to load doctors — try again");
        }
      });
    }
    loadWeek(selectedDoctor, currentWeekStart);
  }

  function handleDoctorChange(doctorId: string) {
    setSelectedDoctor(doctorId);
    loadWeek(doctorId, currentWeekStart);
  }

  function handleNavigateWeek(direction: "prev" | "next") {
    if (direction === "prev" && !canGoBack) return;
    const newWeekStart = new Date(currentWeekStart.getTime() + (direction === "next" ? 7 * DAY_MS : -7 * DAY_MS));
    setCurrentWeekStart(newWeekStart);
    loadWeek(selectedDoctor, newWeekStart);
  }

  async function handleSaveSlot(slotId: string) {
    setError(null);
    try {
      await rescheduleAppointmentAction(appointment.id, slotId);
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reschedule — try again");
    }
  }

  // Close on Escape while open.
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        style={{
          fontSize: 11,
          padding: "4px 8px",
          background: "var(--surface)",
          color: "var(--text)",
          border: "1px solid var(--border)",
          borderRadius: 3,
          cursor: "pointer",
          fontWeight: 600,
          whiteSpace: "nowrap",
        }}
      >
        Edit
      </button>

      {isOpen && (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 650 }}>Edit appointment</h2>
                <p className="muted" style={{ margin: "4px 0 0", fontSize: 12.5 }}>
                  {appointment.patient.name ?? appointment.patient.phone} — currently with {appointment.doctor.name},{" "}
                  {appointment.slot.startsAt.toLocaleString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone,
                  })}
                </p>
              </div>
              <button type="button" className="modal-close" onClick={() => setIsOpen(false)} aria-label="Close">
                ✕
              </button>
            </div>

            <label>
              Doctor
              <select value={selectedDoctor} onChange={(e) => handleDoctorChange(e.target.value)}>
                {doctors.length === 0 && <option value={selectedDoctor}>{appointment.doctor.name}</option>}
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} — {d.department.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="week-nav">
              <button
                type="button"
                onClick={() => handleNavigateWeek("prev")}
                disabled={!canGoBack || isLoading}
                style={{
                  padding: "8px 12px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border-soft)",
                  borderRadius: "var(--radius-sm)",
                  cursor: !canGoBack || isLoading ? "not-allowed" : "pointer",
                  opacity: !canGoBack || isLoading ? 0.5 : 1,
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--text)",
                }}
              >
                {isLoading ? "Loading…" : "← Previous week"}
              </button>
              <span className="range">
                {currentWeekStart.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone })} –{" "}
                {new Date(currentWeekStart.getTime() + 6 * DAY_MS).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  timeZone,
                })}
              </span>
              <button
                type="button"
                onClick={() => handleNavigateWeek("next")}
                disabled={isLoading}
                style={{
                  padding: "8px 12px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border-soft)",
                  borderRadius: "var(--radius-sm)",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  opacity: isLoading ? 0.5 : 1,
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--text)",
                }}
              >
                {isLoading ? "Loading…" : "Next week →"}
              </button>
            </div>

            <WeekSlotPicker
              saveLabel="Reschedule appointment"
              onSave={handleSaveSlot}
              days={displayWeek.map((day: any) => ({
                label: new Date(day.date).toLocaleDateString(undefined, { weekday: "short", timeZone }),
                sub: new Date(day.date).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone }),
                slots: day.slots.map((slot: any) => ({
                  id: slot.id,
                  status: slot.status,
                  time: new Date(slot.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone }),
                  isPast: new Date(slot.startsAt).getTime() < Date.now(),
                })),
              }))}
            />

            {error && (
              <p className="error" style={{ marginTop: 12, fontSize: 12.5 }}>
                {error}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
