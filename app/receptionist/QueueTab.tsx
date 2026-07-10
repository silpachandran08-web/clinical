"use client";

import { useState } from "react";
import { checkInAction } from "@/lib/actions/receptionist";
import {
  CalendarIcon,
  ChevronDownIcon,
  PatientIcon,
  StethoscopeIcon,
} from "../DashboardIcons";

interface QueueTabProps {
  appointments: Array<any>;
  timeZone: string;
}

interface GroupedByDept {
  [deptName: string]: Array<any>;
}

export function QueueTab({ appointments, timeZone }: QueueTabProps) {
  const groupedByDept: GroupedByDept = (appointments || []).reduce((acc, appt) => {
    const deptName = appt?.doctor?.department?.name || "Unknown";
    if (!acc[deptName]) acc[deptName] = [];
    acc[deptName].push(appt);
    return acc;
  }, {});

  const sortedDepts = Object.keys(groupedByDept).sort();
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set(sortedDepts.slice(0, 3)));

  const toggleDept = (deptName: string) => {
    const newSet = new Set(expandedDepts);
    if (newSet.has(deptName)) {
      newSet.delete(deptName);
    } else {
      newSet.add(deptName);
    }
    setExpandedDepts(newSet);
  };

  if (!appointments || appointments.length === 0) {
    return (
      <div style={{ maxWidth: "700px", margin: "0 auto" }}>
        <div className="card">
          <div style={{ textAlign: "center", padding: "32px 24px" }}>
            <CalendarIcon size={40} style={{ color: "var(--text-muted)", marginBottom: 12, opacity: 0.5 }} />
            <p className="muted" style={{ fontSize: 15, marginBottom: 0 }}>
              No patients scheduled for today
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "900px" }}>
      <div className="card" style={{ marginBottom: 12 }}>
        <h2 className="card-title-icon" style={{ marginBottom: 0 }}>
          <CalendarIcon /> Patient Queue
        </h2>
        <p className="muted" style={{ marginTop: 8, marginBottom: 0, fontSize: 13 }}>
          {appointments.length} patient{appointments.length !== 1 ? 's' : ''} today • Click to expand by department
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {sortedDepts.map((deptName) => {
          const patients = groupedByDept[deptName];
          const isExpanded = expandedDepts.has(deptName);

          return (
            <div
              key={deptName}
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
                onClick={() => toggleDept(deptName)}
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
                onMouseEnter={(e) => {
                  if (!isExpanded) {
                    (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-hover)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isExpanded) {
                    (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)";
                  }
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <StethoscopeIcon size={16} />
                  <span>{deptName}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
                    {patients.length}
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
                <div style={{ padding: "0 20px", paddingBottom: 12 }}>
                  {patients.length === 0 ? (
                    <div style={{ padding: "16px 0", textAlign: "center", color: "var(--text-muted)" }}>
                      No patients
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        paddingTop: 12,
                      }}
                    >
                      {patients
                        .sort((a, b) => a.slot.startsAt.getTime() - b.slot.startsAt.getTime())
                        .map((a: any) => (
                          <div
                            key={a.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "12px 14px",
                              background: "var(--surface-2)",
                              borderRadius: "var(--radius-sm)",
                              borderLeft: `3px solid ${
                                a.status === "CANCELLED" || a.status === "NO_SHOW"
                                  ? "var(--danger)"
                                  : a.status === "COMPLETED"
                                    ? "var(--success)"
                                    : "var(--accent)"
                              }`,
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", minWidth: "50px" }}>
                                {a.slot.startsAt.toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  timeZone,
                                })}
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
                                  <div
                                    style={{
                                      fontSize: 11.5,
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
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  padding: "3px 8px",
                                  borderRadius: 4,
                                  background:
                                    a.status === "CANCELLED" || a.status === "NO_SHOW"
                                      ? "var(--danger-soft)"
                                      : a.status === "COMPLETED"
                                        ? "var(--success-soft)"
                                        : "var(--accent-soft)",
                                  color:
                                    a.status === "CANCELLED" || a.status === "NO_SHOW"
                                      ? "var(--danger)"
                                      : a.status === "COMPLETED"
                                        ? "var(--success)"
                                        : "var(--accent)",
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
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
