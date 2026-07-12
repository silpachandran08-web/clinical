"use client";

import { useState } from "react";

const DAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

interface DepartmentOption {
  id: string;
  name: string;
  kind: "MEDICAL" | "NURSE" | "LAB";
}

interface Props {
  departments: DepartmentOption[];
  defaultDepartmentId?: string;
  defaultConsultationFee?: number;
  defaultActiveDays?: number[];
  defaultStartTime?: string;
  defaultEndTime?: string;
  defaultSlotDurationMinutes?: number;
}

export function ScheduleFields({
  departments,
  defaultDepartmentId,
  defaultConsultationFee,
  defaultActiveDays = [],
  defaultStartTime = "09:00",
  defaultEndTime = "17:00",
  defaultSlotDurationMinutes = 20,
}: Props) {
  const [departmentId, setDepartmentId] = useState(defaultDepartmentId ?? "");
  const kind = departments.find((d) => d.id === departmentId)?.kind;
  const scheduleApplies = kind === "MEDICAL" || kind === undefined;
  const activeDaysSet = new Set(defaultActiveDays);

  return (
    <>
      <label>
        Department
        <select
          name="departmentId"
          required
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
        >
          {!defaultDepartmentId && (
            <option value="" disabled>
              Choose a department
            </option>
          )}
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </label>

      {!scheduleApplies && (
        <p className="muted" style={{ marginTop: -4, fontSize: 12.5 }}>
          Consultation fee and schedule don't apply to {kind === "NURSE" ? "nurse" : "lab"} staff — they handle stage-queue patients, not booked appointments.
        </p>
      )}

      <label>
        Consultation Fee
        <input
          type="number"
          name="consultationFee"
          step="0.01"
          min="0.01"
          defaultValue={defaultConsultationFee ?? 0}
          required={scheduleApplies}
          disabled={!scheduleApplies}
        />
      </label>

      <label>Working days</label>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {DAYS.map((d) => (
          <label
            key={d.value}
            style={{ flexDirection: "row", alignItems: "center", gap: 4, color: "var(--text)" }}
          >
            <input
              type="checkbox"
              name="days"
              value={d.value}
              defaultChecked={activeDaysSet.has(d.value)}
              disabled={!scheduleApplies}
              style={{ width: "auto" }}
            />
            {d.label}
          </label>
        ))}
      </div>

      <div className="time-row">
        <label>
          Start time
          <input
            type="time"
            name="startTime"
            defaultValue={defaultStartTime}
            required={scheduleApplies}
            disabled={!scheduleApplies}
          />
        </label>
        <label>
          End time
          <input
            type="time"
            name="endTime"
            defaultValue={defaultEndTime}
            required={scheduleApplies}
            disabled={!scheduleApplies}
          />
        </label>
        <label>
          Slot length (min)
          <input
            type="number"
            name="slotDurationMinutes"
            defaultValue={defaultSlotDurationMinutes}
            min={5}
            step={5}
            required={scheduleApplies}
            disabled={!scheduleApplies}
          />
        </label>
      </div>
    </>
  );
}
