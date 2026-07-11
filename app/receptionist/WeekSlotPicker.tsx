"use client";

import { useState, useTransition, useEffect } from "react";

export interface DaySlot {
  id: string;
  time: string;
  status: string;
  isPast: boolean;
}

export interface DayRow {
  label: string;
  sub: string;
  slots: DaySlot[];
}

export function WeekSlotPicker({
  days,
  onSave,
  saveLabel = "Save appointment",
  preSelectedSlotId,
}: {
  days: DayRow[];
  onSave: (slotId: string) => Promise<void> | void;
  saveLabel?: string;
  preSelectedSlotId?: string;
}) {
  const [selected, setSelected] = useState<{ id: string; label: string } | null>(null);

  useEffect(() => {
    if (preSelectedSlotId) {
      for (const day of days) {
        const slot = day.slots.find((s) => s.id === preSelectedSlotId);
        if (slot) {
          setSelected({ id: slot.id, label: `${day.label} ${day.sub}, ${slot.time}` });
          break;
        }
      }
    }
  }, [preSelectedSlotId, days]);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    if (!selected) return;
    startTransition(async () => {
      await onSave(selected.id);
    });
  }

  return (
    <div>
      {days.map((day) => (
        <div className="day-row" key={`${day.label}-${day.sub}`}>
          <div className="day-label">
            {day.label}
            <span className="day-sub">{day.sub}</span>
          </div>
          <div className="slot-list">
            {day.slots.length === 0 ? (
              <span className="muted" style={{ fontSize: 12.5 }}>
                Not working this day
              </span>
            ) : (
              day.slots.map((slot) =>
                slot.isPast ? (
                  <span key={slot.id} className="slot-btn past">
                    {slot.time}
                  </span>
                ) : slot.status === "OPEN" ? (
                  <button
                    key={slot.id}
                    type="button"
                    className={`slot-btn open${selected?.id === slot.id ? " selected" : ""}`}
                    onClick={() => setSelected({ id: slot.id, label: `${day.label} ${day.sub}, ${slot.time}` })}
                  >
                    {slot.time}
                  </button>
                ) : (
                  <span key={slot.id} className="slot-btn booked">
                    {slot.time}
                  </span>
                ),
              )
            )}
          </div>
        </div>
      ))}

      <div className="slot-save-bar">
        <span className="muted">
          {selected ? (
            <>
              Selected: <strong style={{ color: "var(--text)" }}>{selected.label}</strong>
            </>
          ) : (
            "Click a green slot to select a time."
          )}
        </span>
        <button type="button" onClick={handleSave} disabled={!selected || pending}>
          {pending ? "Saving…" : saveLabel}
        </button>
      </div>
    </div>
  );
}
