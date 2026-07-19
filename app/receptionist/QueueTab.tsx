"use client";

import { useState } from "react";
import Link from "next/link";
import { checkInAction } from "@/lib/actions/receptionist";
import { EditAppointmentModal } from "./EditAppointmentModal";
import { CancelAppointmentButton } from "./CancelAppointmentButton";
import {
  CalendarIcon,
  ChevronDownIcon,
  PatientIcon,
  StethoscopeIcon,
} from "../DashboardIcons";
import { AvatarThumb } from "../AvatarThumb";

interface QueueTabProps {
  appointments: Array<any>;
  timeZone: string;
  isToday: boolean;
  dayLabel: string; // e.g. "Saturday, Jul 19", already in the clinic's timezone
  prevDayHref: string;
  nextDayHref: string;
  todayHref: string;
  canGoBack: boolean; // false when already on today — the queue never looks at the past
}

type ViewMode = "all" | "department" | "doctor";

// Terminal rows keep their history styling but never get a queue position.
const ACTIVE_STATUSES = new Set(["CONFIRMED", "CHECKED_IN", "AT_STAGE", "IN_PROGRESS"]);

const dayNavButtonStyle = (enabled: boolean): React.CSSProperties => ({
  padding: "7px 12px",
  background: "var(--surface-2)",
  border: "1px solid var(--border-soft)",
  borderRadius: "var(--radius-sm)",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--text)",
  textDecoration: "none",
  cursor: enabled ? "pointer" : "not-allowed",
  opacity: enabled ? 1 : 0.45,
  whiteSpace: "nowrap",
});

/**
 * One patient row, shared by every view. `position` is the patient's spot in
 * whichever queue the row is rendered under (overall / department / doctor) —
 * null for cancelled/completed rows, which are history, not queue.
 */
function AppointmentRow({
  a,
  timeZone,
  isToday,
  position,
  showDoctor,
}: {
  a: any;
  timeZone: string;
  isToday: boolean;
  position: number | null;
  showDoctor: boolean;
}) {
  const isTerminal = a.status === "CANCELLED" || a.status === "NO_SHOW";
  const accent = isTerminal ? "var(--danger)" : a.status === "COMPLETED" ? "var(--success)" : "var(--accent)";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        padding: "12px 14px",
        background: "var(--surface-2)",
        borderRadius: "var(--radius-sm)",
        borderLeft: `3px solid ${accent}`,
        rowGap: 8,
        opacity: isTerminal ? 0.65 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: position !== null ? "var(--accent-soft)" : "var(--surface)",
            color: position !== null ? "var(--accent)" : "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {position !== null ? position : "—"}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", minWidth: 50 }}>
          {a.slot.startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone })}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
          <PatientIcon size={14} />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {a.patient.name ?? a.patient.phone}
            </div>
            {showDoctor && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 11.5,
                  color: "var(--text-muted)",
                  overflow: "hidden",
                }}
              >
                <AvatarThumb src={a.doctor.photoUrl} name={a.doctor.name} size={16} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {a.doctor.name}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      <div
        className="appt-row-actions"
        style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: "3px 8px",
            borderRadius: 4,
            background: isTerminal
              ? "var(--danger-soft)"
              : a.status === "COMPLETED"
                ? "var(--success-soft)"
                : "var(--accent-soft)",
            color: accent,
          }}
        >
          {a.bookedByStaff ? "Walk-in" : "Online"}
        </span>
        {a.status === "AT_STAGE" && a.currentDepartment && (
          <span className="badge">At: {a.currentDepartment.name}</span>
        )}
        {isToday && a.status === "CONFIRMED" && (
          <form action={checkInAction} style={{ margin: 0 }}>
            <input type="hidden" name="appointmentId" value={a.id} />
            <button
              type="submit"
              style={{
                padding: "5px 11px",
                fontSize: 12,
                fontWeight: 600,
                background: "var(--success)",
                color: "white",
                border: "none",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                transition: "background 0.2s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "var(--text)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "var(--success)";
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
  );
}

/** Collapsible group card used by the department and doctor views. */
function GroupSection({
  title,
  icon,
  count,
  isExpanded,
  onToggle,
  children,
}: {
  title: React.ReactNode;
  icon: React.ReactNode;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border-soft)",
        borderRadius: "var(--radius)",
        overflow: "hidden",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%",
          padding: "14px 20px",
          background: isExpanded ? "var(--accent-soft)" : "var(--surface-2)",
          border: "none",
          borderBottom: isExpanded ? "1px solid var(--border-soft)" : "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
          fontSize: 14,
          fontWeight: 600,
          color: isExpanded ? "var(--accent)" : "var(--text)",
          transition: "background 0.2s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          {icon}
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <span
            style={{
              background: isExpanded ? "var(--accent)" : "var(--text-muted)",
              color: "white",
              padding: "3px 10px",
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 600,
              transition: "background 0.2s ease",
            }}
          >
            {count}
          </span>
          <ChevronDownIcon
            size={18}
            style={{
              transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
              color: isExpanded ? "var(--accent)" : "var(--text-muted)",
            }}
          />
        </div>
      </button>
      {isExpanded && (
        <div style={{ padding: "12px 20px", display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
      )}
    </div>
  );
}

export function QueueTab({
  appointments,
  timeZone,
  isToday,
  dayLabel,
  prevDayHref,
  nextDayHref,
  todayHref,
  canGoBack,
}: QueueTabProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  // Expansion keys are prefixed with the view mode so each view remembers its
  // own open/closed groups independently.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggleGroup = (key: string) => {
    const next = new Set(collapsed);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setCollapsed(next);
  };

  const sorted = [...(appointments || [])].sort(
    (a, b) => a.slot.startsAt.getTime() - b.slot.startsAt.getTime()
  );
  const activeCount = sorted.filter((a) => ACTIVE_STATUSES.has(a.status)).length;

  /** Time-ordered rows with a running queue position for active appointments. */
  const renderRows = (rows: Array<any>, showDoctor: boolean) => {
    let position = 0;
    return rows.map((a) => {
      const pos = ACTIVE_STATUSES.has(a.status) ? ++position : null;
      return (
        <AppointmentRow key={a.id} a={a} timeZone={timeZone} isToday={isToday} position={pos} showDoctor={showDoctor} />
      );
    });
  };

  const groupBy = (keyOf: (a: any) => string) => {
    const groups = new Map<string, Array<any>>();
    for (const a of sorted) {
      const key = keyOf(a);
      const bucket = groups.get(key);
      if (bucket) bucket.push(a);
      else groups.set(key, [a]);
    }
    return [...groups.entries()].sort(([x], [y]) => x.localeCompare(y));
  };

  const viewSwitch = (
    <div
      style={{
        display: "inline-flex",
        background: "var(--surface-2)",
        border: "1px solid var(--border-soft)",
        borderRadius: "var(--radius-sm)",
        padding: 3,
        gap: 2,
      }}
    >
      {(
        [
          ["all", "Overall"],
          ["department", "By department"],
          ["doctor", "By doctor"],
        ] as Array<[ViewMode, string]>
      ).map(([mode, label]) => (
        <button
          key={mode}
          type="button"
          onClick={() => setViewMode(mode)}
          style={{
            padding: "6px 12px",
            fontSize: 12,
            fontWeight: 600,
            border: "none",
            borderRadius: 5,
            cursor: "pointer",
            background: viewMode === mode ? "var(--surface)" : "transparent",
            color: viewMode === mode ? "var(--accent)" : "var(--text-muted)",
            boxShadow: viewMode === mode ? "var(--shadow-card)" : "none",
            transition: "all 0.15s ease",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );

  // Day navigation lives in the header card so it's reachable even when the
  // selected day has no appointments (you must be able to come back!).
  const headerCard = (
    <div className="card" style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 className="card-title-icon" style={{ marginBottom: 0 }}>
            <CalendarIcon /> Patient Queue
          </h2>
          <p className="muted" style={{ marginTop: 8, marginBottom: 0, fontSize: 13 }}>
            {sorted.length} patient{sorted.length !== 1 ? "s" : ""} {isToday ? "today" : `on ${dayLabel}`}
            {activeCount > 0 && activeCount !== sorted.length ? ` (${activeCount} in queue)` : ""}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {canGoBack ? (
            <Link href={prevDayHref} style={dayNavButtonStyle(true)}>
              ← Previous
            </Link>
          ) : (
            <span style={dayNavButtonStyle(false)}>← Previous</span>
          )}
          <span
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: isToday ? "var(--accent)" : "var(--text)",
              padding: "0 4px",
              whiteSpace: "nowrap",
            }}
          >
            {isToday ? `Today — ${dayLabel}` : dayLabel}
          </span>
          <Link href={nextDayHref} style={dayNavButtonStyle(true)}>
            Next →
          </Link>
          {!isToday && (
            <Link href={todayHref} style={{ ...dayNavButtonStyle(true), color: "var(--accent)" }}>
              Today
            </Link>
          )}
        </div>
      </div>
      {sorted.length > 0 && <div style={{ marginTop: 12 }}>{viewSwitch}</div>}
    </div>
  );

  if (sorted.length === 0) {
    return (
      <div>
        {headerCard}
        <div className="card">
          <div style={{ textAlign: "center", padding: "32px 24px" }}>
            <CalendarIcon size={40} style={{ color: "var(--text-muted)", marginBottom: 12, opacity: 0.5 }} />
            <p className="muted" style={{ fontSize: 15, marginBottom: 0 }}>
              No patients scheduled for {isToday ? "today" : dayLabel}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {headerCard}

      {viewMode === "all" && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {renderRows(sorted, true)}
        </div>
      )}

      {viewMode === "department" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {groupBy((a) => a?.doctor?.department?.name || "Unknown").map(([deptName, rows]) => {
            const key = `department:${deptName}`;
            return (
              <GroupSection
                key={key}
                title={deptName}
                icon={<StethoscopeIcon size={16} />}
                count={rows.filter((a) => ACTIVE_STATUSES.has(a.status)).length}
                isExpanded={!collapsed.has(key)}
                onToggle={() => toggleGroup(key)}
              >
                {renderRows(rows, true)}
              </GroupSection>
            );
          })}
        </div>
      )}

      {viewMode === "doctor" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {groupBy((a) => a?.doctor?.name || "Unknown").map(([doctorName, rows]) => {
            const key = `doctor:${doctorName}`;
            const doctor = rows[0].doctor;
            return (
              <GroupSection
                key={key}
                title={
                  <>
                    {doctorName}
                    <span style={{ fontWeight: 500, color: "var(--text-muted)", marginLeft: 8, fontSize: 12.5 }}>
                      {doctor?.department?.name ?? ""}
                    </span>
                  </>
                }
                icon={<AvatarThumb src={doctor?.photoUrl} name={doctorName} size={22} />}
                count={rows.filter((a) => ACTIVE_STATUSES.has(a.status)).length}
                isExpanded={!collapsed.has(key)}
                onToggle={() => toggleGroup(key)}
              >
                {renderRows(rows, false)}
              </GroupSection>
            );
          })}
        </div>
      )}
    </div>
  );
}
