"use client";

import { useState } from "react";

interface TreatmentRow {
  name: string;
  givenBy: "Nurse" | "Doctor";
}

const emptyRow = (): TreatmentRow => ({ name: "", givenBy: "Nurse" });

/**
 * Same auto-add-row-on-type UX as PrescriptionBuilder, but for things given
 * to the patient right now at the clinic (an injection, an IV, etc.) rather
 * than a take-home prescription — no multi-day timing, just who gave it.
 */
export function AdministeredTreatmentBuilder({ fieldName = "administeredTreatment" }: { fieldName?: string }) {
  const [rows, setRows] = useState<TreatmentRow[]>([emptyRow()]);

  function updateName(index: number, value: string) {
    setRows((prev) => {
      const next = prev.map((row, i) => (i === index ? { ...row, name: value } : row));
      if (index === next.length - 1 && value.trim() !== "") {
        next.push(emptyRow());
      }
      return next;
    });
  }

  function setGivenBy(index: number, givenBy: TreatmentRow["givenBy"]) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, givenBy } : row)));
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  const composed = rows
    .filter((r) => r.name.trim())
    .map((r) => `${r.name.trim()} (${r.givenBy})`)
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
                placeholder="e.g. Vitamin B12 injection"
                value={row.name}
                onChange={(e) => updateName(i, e.target.value)}
              />
              <div className="med-timing">
                {(["Nurse", "Doctor"] as const).map((opt) => (
                  <label key={opt} className="med-timing-option">
                    <input
                      type="radio"
                      name={`${fieldName}-givenBy-${i}`}
                      checked={row.givenBy === opt}
                      onChange={() => setGivenBy(i, opt)}
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
