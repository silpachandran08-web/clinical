"use client";

import { useState, useTransition } from "react";
import { saveClinicAction } from "@/lib/actions/clinic";
import type { Clinic } from "@prisma/client";

const LOCALE_LABELS: Record<string, string> = { AR: "Arabic", EN: "English" };

export function ClinicProfileForm({ clinic }: { clinic: Clinic }) {
  const [isEditing, setIsEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await saveClinicAction(formData);
      setIsEditing(false);
    });
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
        Timezone
        <input name="timezone" defaultValue={clinic.timezone} />
      </label>
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
