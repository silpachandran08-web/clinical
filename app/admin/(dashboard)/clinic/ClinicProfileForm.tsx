"use client";

import { useState, useTransition } from "react";
import { saveClinicAction } from "@/lib/actions/clinic";
import type { Clinic } from "@prisma/client";

const LOCALE_LABELS: Record<string, string> = { AR: "Arabic", EN: "English" };
const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function ClinicProfileForm({ clinic }: { clinic: Clinic }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isOpen24_7, setIsOpen24_7] = useState(clinic.isOpen24_7);
  const [closedDays, setClosedDays] = useState<Set<number>>(new Set(clinic.weekendDays));
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await saveClinicAction(formData);
      setIsEditing(false);
    });
  }

  function toggleClosedDay(day: number) {
    const newDays = new Set(closedDays);
    if (newDays.has(day)) {
      newDays.delete(day);
    } else {
      newDays.add(day);
    }
    setClosedDays(newDays);
  }

  if (!isEditing) {
    return (
      <div>
        <div className="stack" style={{ gap: 6, marginBottom: 14 }}>
          <p style={{ margin: 0 }}>
            <span className="muted">Clinic name:</span> {clinic.name}
          </p>
          <p style={{ margin: 0 }}>
            <span className="muted">WhatsApp number:</span> {clinic.whatsappNumber ?? "—"}
          </p>
          <p style={{ margin: 0 }}>
            <span className="muted">Address:</span> {clinic.address ?? "—"}
          </p>
          <p style={{ margin: 0 }}>
            <span className="muted">Phone:</span> {clinic.phone ?? "—"}
          </p>
          <p style={{ margin: 0 }}>
            <span className="muted">Receptionist name (WhatsApp AI):</span> {clinic.receptionistName ?? "—"}
          </p>
          <p style={{ margin: 0 }}>
            <span className="muted">Operating hours:</span>{" "}
            {clinic.isOpen24_7 ? "24/7" : `${clinic.openingTime} - ${clinic.closingTime}`}
          </p>
          <p style={{ margin: 0 }}>
            <span className="muted">Closed days:</span>{" "}
            {clinic.weekendDays.length > 0 ? clinic.weekendDays.map((d) => DAY_LABELS[d]).join(", ") : "None"}
          </p>
          <p style={{ margin: 0 }}>
            <span className="muted">Timezone:</span> {clinic.timezone}
          </p>
          <p style={{ margin: 0 }}>
            <span className="muted">Default language:</span> {LOCALE_LABELS[clinic.defaultLocale]}
          </p>
        </div>
        <button type="button" className="secondary" onClick={() => setIsEditing(true)}>
          Edit
        </button>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="stack">
      <label>
        Clinic name
        <input name="name" defaultValue={clinic.name} required />
      </label>
      <label>
        WhatsApp number (clean E.164, e.g. +15551234567)
        <input name="whatsappNumber" defaultValue={clinic.whatsappNumber ?? ""} autoComplete="off" required />
      </label>
      <label>
        Address (shown on printed prescriptions)
        <input name="address" defaultValue={clinic.address ?? ""} placeholder="e.g. King Fahd Rd, Riyadh" />
      </label>
      <label>
        Phone (shown on printed prescriptions)
        <input name="phone" defaultValue={clinic.phone ?? ""} placeholder="e.g. +966 11 234 5678" />
      </label>
      <label>
        Receptionist name (WhatsApp AI)
        <input
          name="receptionistName"
          defaultValue={clinic.receptionistName ?? ""}
          placeholder="e.g. Sara — the AI introduces itself with this name"
        />
      </label>
      <label>
        <input
          type="checkbox"
          name="isOpen24_7"
          defaultChecked={clinic.isOpen24_7}
          onChange={(e) => setIsOpen24_7(e.target.checked)}
        />
        Clinic operates 24/7
      </label>
      {!isOpen24_7 && (
        <>
          <label>
            Opening time
            <input type="time" name="openingTime" defaultValue={clinic.openingTime ?? "08:00"} />
          </label>
          <label>
            Closing time
            <input type="time" name="closingTime" defaultValue={clinic.closingTime ?? "18:00"} />
          </label>
        </>
      )}
      <label>
        Timezone
        <input name="timezone" defaultValue={clinic.timezone} />
      </label>
      <fieldset style={{ border: "1px solid var(--border)", padding: 12, borderRadius: 4 }}>
        <legend style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: 12 }}>Closed days</legend>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {DAY_LABELS.map((label, day) => (
            <label key={day} style={{ display: "flex", alignItems: "center", gap: 6, margin: 0 }}>
              <input
                type="checkbox"
                name={`closedDay_${day}`}
                checked={closedDays.has(day)}
                onChange={() => toggleClosedDay(day)}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <label>
        Default language
        <select name="defaultLocale" defaultValue={clinic.defaultLocale}>
          <option value="AR">Arabic</option>
          <option value="EN">English</option>
        </select>
      </label>

      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </button>
        <button type="button" className="secondary" onClick={() => setIsEditing(false)} disabled={pending}>
          Cancel
        </button>
      </div>
    </form>
  );
}
