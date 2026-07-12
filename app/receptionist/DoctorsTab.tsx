"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Clinic } from "@prisma/client";
import { ChevronLeftIcon, ChevronRightIcon, StethoscopeIcon } from "../DashboardIcons";
import { AvatarThumb } from "../AvatarThumb";
import type { WeekDay } from "@/src/receptionistHandlers";

interface DoctorWithWeeks {
  id: string;
  name: string;
  photoUrl: string | null;
  department: { name: string };
  isLive: boolean;
  weeksData: Array<{
    weekStart: Date;
    weekLabel: string;
    days: WeekDay[];
  }>;
}

interface DoctorsTabProps {
  clinic: Clinic;
  doctors: DoctorWithWeeks[];
  now: Date;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * `day.date` is a UTC timestamp for midnight in the CLINIC's timezone (e.g.
 * 21:00 UTC the prior day for Asia/Riyadh, UTC+3) — `Date.getUTCDay()` reads
 * the raw UTC weekday and comes out a day behind whenever that offset crosses
 * a UTC day boundary. Read the weekday back through the clinic's timezone
 * instead, the same way `dateLabel` below already reads the date.
 */
function weekdayInTimezone(date: Date, timeZone: string): number {
  const label = date.toLocaleDateString("en-US", { weekday: "short", timeZone });
  return DAY_NAMES.indexOf(label);
}

export function DoctorsTab({ clinic, doctors, now }: DoctorsTabProps) {
  const router = useRouter();
  // Compute working days (all days except weekends)
  const workingDayNums = Array.from({ length: 7 }, (_, i) => i).filter(
    (day) => !clinic.weekendDays.includes(day)
  );

  // Group doctors by department
  const doctorsByDept = doctors.reduce<Record<string, DoctorWithWeeks[]>>((acc, doc) => {
    const dept = doc.department?.name || "Other";
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(doc);
    return acc;
  }, {});

  const sortedDepts = Object.keys(doctorsByDept).sort();
  const [selectedDept, setSelectedDept] = useState(sortedDepts[0] || "");
  const [expandedDoctor, setExpandedDoctor] = useState<string | null>(null);
  const [activeWeekIndex, setActiveWeekIndex] = useState<{ [doctorId: string]: number }>({});

  if (!selectedDept || !doctorsByDept[selectedDept]) {
    return (
      <div className="card">
        <p className="empty-state">No doctors available</p>
      </div>
    );
  }

  const selectedDoctors = doctorsByDept[selectedDept];

  const handleSlotClick = (doctorId: string, slotId: string) => {
    const query = new URLSearchParams();
    query.set("tab", "booking");
    query.set("doctorId", doctorId);
    query.set("slotId", slotId);
    router.push(`/receptionist?${query.toString()}#assign-doctor`);
  };

  const getWeekIndex = (doctorId: string): number => {
    return activeWeekIndex[doctorId] ?? 0;
  };

  return (
    <div>
      {/* Department Tabs */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "1px solid var(--border-soft)",
          marginBottom: 20,
          backgroundColor: "var(--surface)",
          borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
        }}
      >
        {sortedDepts.map((dept) => (
          <button
            key={dept}
            onClick={() => {
              setSelectedDept(dept);
              setExpandedDoctor(null);
              setActiveWeekIndex({});
            }}
            style={{
              flex: 1,
              padding: "14px 16px",
              background: selectedDept === dept ? "var(--surface)" : "transparent",
              border: "none",
              borderBottom: selectedDept === dept ? "2px solid var(--accent)" : "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: selectedDept === dept ? 600 : 500,
              color: selectedDept === dept ? "var(--text)" : "var(--text-muted)",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              if (selectedDept !== dept) {
                (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)";
              }
            }}
            onMouseLeave={(e) => {
              if (selectedDept !== dept) {
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              }
            }}
          >
            {dept}
          </button>
        ))}
      </div>

      {/* Doctor Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {selectedDoctors.map((doctor) => {
          const isExpanded = expandedDoctor === doctor.id;
          const weekIndex = getWeekIndex(doctor.id);
          const currentWeek = doctor.weeksData[weekIndex];

          return (
            <div
              key={doctor.id}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border-soft)",
                borderRadius: "var(--radius)",
                overflow: "hidden",
                boxShadow: "var(--shadow-card)",
              }}
            >
              {/* Doctor Header */}
              <div
                style={{
                  padding: "16px 20px",
                  background: isExpanded ? "var(--accent-soft)" : "var(--surface-2)",
                  borderBottom: isExpanded ? "1px solid var(--border-soft)" : "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  transition: "background 0.2s ease",
                }}
                onClick={() => setExpandedDoctor(isExpanded ? null : doctor.id)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <AvatarThumb src={doctor.photoUrl} name={doctor.name} size={32} />
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: doctor.isLive ? "var(--success)" : "var(--danger)",
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                      {doctor.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        marginTop: 2,
                      }}
                    >
                      {doctor.isLive ? "Available" : "Offline"}
                    </div>
                  </div>
                </div>
                <ChevronRightIcon
                  size={18}
                  style={{
                    transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                    transition: "transform 0.3s ease",
                    color: "var(--text-muted)",
                    flexShrink: 0,
                  }}
                />
              </div>

              {/* Expanded: Week Carousel + Slot Grid */}
              {isExpanded && currentWeek && (
                <div style={{ padding: "20px" }}>
                  {/* Week Navigator */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 16,
                      gap: 12,
                    }}
                  >
                    <button
                      onClick={() =>
                        setActiveWeekIndex({
                          ...activeWeekIndex,
                          [doctor.id]: Math.max(0, weekIndex - 1),
                        })
                      }
                      disabled={weekIndex === 0}
                      style={{
                        padding: "6px 10px",
                        background: "var(--surface-2)",
                        border: "1px solid var(--border-soft)",
                        borderRadius: "var(--radius-sm)",
                        cursor: weekIndex === 0 ? "not-allowed" : "pointer",
                        opacity: weekIndex === 0 ? 0.5 : 1,
                        fontSize: 12,
                        fontWeight: 500,
                        color: "var(--text)",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <ChevronLeftIcon size={14} /> Prev
                    </button>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--text)",
                        textAlign: "center",
                        flex: 1,
                      }}
                    >
                      {currentWeek.weekLabel}
                    </div>
                    <button
                      onClick={() =>
                        setActiveWeekIndex({
                          ...activeWeekIndex,
                          [doctor.id]: Math.min(
                            doctor.weeksData.length - 1,
                            weekIndex + 1
                          ),
                        })
                      }
                      disabled={weekIndex === doctor.weeksData.length - 1}
                      style={{
                        padding: "6px 10px",
                        background: "var(--surface-2)",
                        border: "1px solid var(--border-soft)",
                        borderRadius: "var(--radius-sm)",
                        cursor:
                          weekIndex === doctor.weeksData.length - 1
                            ? "not-allowed"
                            : "pointer",
                        opacity:
                          weekIndex === doctor.weeksData.length - 1 ? 0.5 : 1,
                        fontSize: 12,
                        fontWeight: 500,
                        color: "var(--text)",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      Next <ChevronRightIcon size={14} />
                    </button>
                  </div>

                  {/* Week Grid - Only Working Days (Today & Future) */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 12 }}>
                    {currentWeek.days
                      .filter((day) => {
                        // Only show working days
                        if (!workingDayNums.includes(weekdayInTimezone(day.date, clinic.timezone))) return false;
                        // Only show today and future dates
                        const dayStart = new Date(day.date);
                        dayStart.setUTCHours(0, 0, 0, 0);
                        const todayStart = new Date(now);
                        todayStart.setUTCHours(0, 0, 0, 0);
                        return dayStart.getTime() >= todayStart.getTime();
                      })
                      .map((day, idx) => {
                        const dayOfWeek = weekdayInTimezone(day.date, clinic.timezone);
                        const dayLabel = DAY_NAMES[dayOfWeek];
                        const dateLabel = day.date.toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          timeZone: clinic.timezone,
                        });

                        // Check if this is today
                        const dayStart = new Date(day.date);
                        dayStart.setUTCHours(0, 0, 0, 0);
                        const todayStart = new Date(now);
                        todayStart.setUTCHours(0, 0, 0, 0);
                        const isToday = dayStart.getTime() === todayStart.getTime();

                        return (
                          <div key={idx} style={{ flex: 1, minWidth: "0" }}>
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: "var(--text-muted)",
                                marginBottom: 8,
                                textAlign: "center",
                              }}
                            >
                              {dayLabel} {dateLabel}
                            </div>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 6,
                              }}
                            >
                              {day.slots.length === 0 ? (
                                <div
                                  style={{
                                    fontSize: 11,
                                    color: "var(--text-muted)",
                                    textAlign: "center",
                                    padding: "12px 8px",
                                  }}
                                >
                                  No slots
                                </div>
                              ) : (
                                day.slots.map((slot) => {
                                  const time = new Date(slot.startsAt).toLocaleTimeString(
                                    undefined,
                                    { hour: "2-digit", minute: "2-digit", timeZone: clinic.timezone }
                                  );
                                  const isOpen = slot.status === "OPEN";
                                  const isPast = isToday && slot.startsAt.getTime() < now.getTime();
                                  const canBook = isOpen && !isPast;

                                  return (
                                    <button
                                      key={slot.id}
                                      onClick={() =>
                                        canBook && handleSlotClick(doctor.id, slot.id)
                                      }
                                      disabled={!canBook}
                                      style={{
                                        padding: "8px 8px",
                                        fontSize: 11,
                                        fontWeight: 500,
                                        border: "1px solid var(--border-soft)",
                                        borderRadius: "var(--radius-sm)",
                                        background:
                                          isPast
                                            ? "var(--surface-2)"
                                            : isOpen
                                              ? "var(--success-soft)"
                                              : slot.status === "BLOCKED"
                                                ? "var(--surface-2)"
                                                : "var(--danger-soft)",
                                        color:
                                          isPast
                                            ? "var(--text-muted)"
                                            : isOpen
                                              ? "var(--success)"
                                              : slot.status === "BLOCKED"
                                                ? "var(--text-muted)"
                                                : "var(--danger)",
                                        cursor: canBook ? "pointer" : "not-allowed",
                                        opacity: isPast ? 0.5 : 1,
                                        transition: "all 0.15s ease",
                                        whiteSpace: "nowrap",
                                      }}
                                      onMouseEnter={(e) => {
                                        if (canBook) {
                                          (e.currentTarget as HTMLButtonElement).style.background =
                                            "var(--success)";
                                          (e.currentTarget as HTMLButtonElement).style.color = "white";
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        (e.currentTarget as HTMLButtonElement).style.background = isPast
                                          ? "var(--surface-2)"
                                          : isOpen
                                            ? "var(--success-soft)"
                                            : slot.status === "BLOCKED"
                                              ? "var(--surface-2)"
                                              : "var(--danger-soft)";
                                        (e.currentTarget as HTMLButtonElement).style.color = isPast
                                          ? "var(--text-muted)"
                                          : isOpen
                                            ? "var(--success)"
                                            : slot.status === "BLOCKED"
                                              ? "var(--text-muted)"
                                              : "var(--danger)";
                                      }}
                                    >
                                      {time}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Legend */}
                  <div
                    style={{
                      marginTop: 16,
                      paddingTop: 12,
                      borderTop: "1px solid var(--border-soft)",
                      fontSize: 11,
                      color: "var(--text-muted)",
                      textAlign: "center",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 12,
                      justifyContent: "center",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          width: 16,
                          height: 16,
                          background: "var(--success-soft)",
                          borderRadius: 3,
                          border: "1px solid var(--border-soft)",
                        }}
                      />
                      Open
                    </span>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          width: 16,
                          height: 16,
                          background: "var(--danger-soft)",
                          borderRadius: 3,
                          border: "1px solid var(--border-soft)",
                        }}
                      />
                      Booked
                    </span>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          width: 16,
                          height: 16,
                          background: "var(--surface-2)",
                          borderRadius: 3,
                          border: "1px solid var(--border-soft)",
                        }}
                      />
                      Past/Blocked
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
