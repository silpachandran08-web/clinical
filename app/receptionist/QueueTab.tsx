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
  today: Date;
}

interface GroupedByDept {
  [deptName: string]: Array<any>;
}

export function QueueTab({ appointments, timeZone, today }: QueueTabProps) {
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());

  const groupedByDept: GroupedByDept = appointments.reduce((acc, appt) => {
    const deptName = appt.doctor.department.name;
    if (!acc[deptName]) acc[deptName] = [];
    acc[deptName].push(appt);
    return acc;
  }, {});

  const sortedDepts = Object.keys(groupedByDept).sort();

  const toggleDept = (deptName: string) => {
    const newSet = new Set(expandedDepts);
    if (newSet.has(deptName)) {
      newSet.delete(deptName);
    } else {
      newSet.add(deptName);
    }
    setExpandedDepts(newSet);
  };

  if (appointments.length === 0) {
    return (
      <div style={{ maxWidth: "600px" }}>
        <div className="card">
          <p className="empty-state">
            No patients scheduled for today. Check back later or navigate to future dates.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "900px" }}>
      <div className="card">
        <h2 className="card-title-icon">
          <CalendarIcon /> Patient queue by department
        </h2>
        <p className="muted" style={{ marginBottom: 16, fontSize: 12.5 }}>
          Today's schedule grouped by department. Click to expand/collapse.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sortedDepts.map((deptName) => {
            const patients = groupedByDept[deptName];
            const isExpanded = expandedDepts.has(deptName);

            return (
              <div key={deptName} style={{ border: "1px solid var(--border-soft)", borderRadius: "var(--radius)" }}>
                <button
                  type="button"
                  onClick={() => toggleDept(deptName)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    background: "var(--surface-2)",
                    border: "none",
                    borderRadius: "var(--radius)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--text)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <StethoscopeIcon size={16} />
                    {deptName}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        background: "var(--accent)",
                        color: "white",
                        padding: "2px 8px",
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 500,
                      }}
                    >
                      {patients.length}
                    </span>
                    <ChevronDownIcon
                      size={18}
                      style={{
                        transition: "transform 0.2s",
                        transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                      }}
                    />
                  </div>
                </button>

                {isExpanded && (
                  <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border-soft)" }}>
                    <div className="appt-table">
                      {patients
                        .sort((a, b) => a.slot.startsAt.getTime() - b.slot.startsAt.getTime())
                        .map((a) => (
                          <div className="appt-row" key={a.id}>
                            <span className="appt-time">
                              {a.slot.startsAt.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                                timeZone,
                              })}
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
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
