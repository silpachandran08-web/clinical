"use client";

import { useState } from "react";

interface MedicineRow {
  name: string;
  timing: string[];
}

const TIMING_OPTIONS = ["Morning", "Afternoon", "Evening", "Night"];

const emptyRow = (): MedicineRow => ({ name: "", timing: [] });

export function PrescriptionBuilder({ fieldName = "prescription" }: { fieldName?: string }) {
  const [rows, setRows] = useState<MedicineRow[]>([emptyRow()]);

  function updateName(index: number, value: string) {
    setRows((prev) => {
      const next = prev.map((row, i) => (i === index ? { ...row, name: value } : row));
      // Auto-add a fresh row the moment you start typing in what was the last one.
      if (index === next.length - 1 && value.trim() !== "") {
        next.push(emptyRow());
      }
      return next;
    });
  }

  function toggleTiming(index: number, option: string) {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const timing = row.timing.includes(option)
          ? row.timing.filter((t) => t !== option)
          : [...row.timing, option];
        return { ...row, timing };
      }),
    );
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  const composed = rows
    .filter((r) => r.name.trim())
    .map((r) => (r.timing.length ? `${r.name.trim()} (${r.timing.join(", ")})` : r.name.trim()))
    .join("; ");

  return (
    <div>
      <input type="hidden" name={fieldName} value={composed} />
      <div className="med-list">
        {rows.map((row, i) => {
          const isLastEmptyRow = i === rows.length - 1 && row.name.trim() === "";
          return (
            <div className="med-row" key={i}>
              <input
                placeholder="Medicine name"
                value={row.name}
                onChange={(e) => updateName(i, e.target.value)}
              />
              <div className="med-timing">
                {TIMING_OPTIONS.map((opt) => (
                  <label key={opt} className="med-timing-option">
                    <input
                      type="checkbox"
                      checked={row.timing.includes(opt)}
                      onChange={() => toggleTiming(i, opt)}
                    />
                    {opt}
                  </label>
                ))}
              </div>
              {!isLastEmptyRow && (
                <button type="button" className="secondary med-remove" onClick={() => removeRow(i)}>
                  Remove
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
