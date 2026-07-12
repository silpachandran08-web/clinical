"use client";

import { useState } from "react";
import { saveLabFieldDefinitionsAction } from "@/lib/actions/departments";

interface Field {
  label: string;
  fieldType: "TEXT" | "NUMBER" | "TEXTAREA" | "ATTACHMENT";
  required: boolean;
}

const FIELD_TYPE_LABELS: Record<Field["fieldType"], string> = {
  TEXT: "Text",
  NUMBER: "Number",
  TEXTAREA: "Long text",
  ATTACHMENT: "Attachment (image)",
};

export function LabFieldEditor({
  departmentId,
  initialFields,
}: {
  departmentId: string;
  initialFields: Array<{ label: string; fieldType: Field["fieldType"]; required: boolean }>;
}) {
  const [fields, setFields] = useState<Field[]>(initialFields);
  const [saved, setSaved] = useState(false);

  function addField() {
    setFields((f) => [...f, { label: "", fieldType: "TEXT", required: false }]);
    setSaved(false);
  }

  function removeField(index: number) {
    setFields((f) => f.filter((_, i) => i !== index));
    setSaved(false);
  }

  function moveField(index: number, direction: -1 | 1) {
    setFields((f) => {
      const next = [...f];
      const target = index + direction;
      if (target < 0 || target >= next.length) return next;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setSaved(false);
  }

  function updateField(index: number, patch: Partial<Field>) {
    setFields((f) => f.map((field, i) => (i === index ? { ...field, ...patch } : field)));
    setSaved(false);
  }

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
        {fields.map((field, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              placeholder="e.g. Hemoglobin (g/dL)"
              value={field.label}
              onChange={(e) => updateField(i, { label: e.target.value })}
              style={{ flex: 2 }}
            />
            <select
              value={field.fieldType}
              onChange={(e) => updateField(i, { fieldType: e.target.value as Field["fieldType"] })}
              style={{ flex: 1 }}
            >
              {Object.entries(FIELD_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <label className="card-title-icon" style={{ flexDirection: "row", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
              <input
                type="checkbox"
                checked={field.required}
                onChange={(e) => updateField(i, { required: e.target.checked })}
                style={{ width: "auto" }}
              />
              Required
            </label>
            <button type="button" className="secondary" onClick={() => moveField(i, -1)} disabled={i === 0}>
              ↑
            </button>
            <button type="button" className="secondary" onClick={() => moveField(i, 1)} disabled={i === fields.length - 1}>
              ↓
            </button>
            <button type="button" className="danger" onClick={() => removeField(i)}>
              Remove
            </button>
          </div>
        ))}
        {fields.length === 0 && <p className="empty-state">No fields defined yet.</p>}
      </div>

      <button type="button" className="secondary" onClick={addField} style={{ marginBottom: 14 }}>
        + Add field
      </button>

      <form
        action={saveLabFieldDefinitionsAction}
        onSubmit={() => setSaved(true)}
        style={{ display: "flex", alignItems: "center", gap: 12 }}
      >
        <input type="hidden" name="departmentId" value={departmentId} />
        <input type="hidden" name="fields" value={JSON.stringify(fields)} />
        <button type="submit">Save fields</button>
        {saved && <span className="muted" style={{ fontSize: 12.5 }}>Saved.</span>}
      </form>
    </div>
  );
}
