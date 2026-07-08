"use client";

import { useState, useTransition } from "react";
import { saveClinicAction } from "@/lib/actions/clinic";
import type { Clinic } from "@prisma/client";

export function ClinicProfileForm({ clinic }: { clinic: Clinic }) {
  const [isEditing, setIsEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await saveClinicAction(formData);
      setIsEditing(false);
    });
  }

  return (
    <form action={handleSubmit} className="stack">
      <label>
        Clinic name
        <input name="name" defaultValue={clinic.name} disabled={!isEditing} required />
      </label>
      <label>
        WhatsApp number (clean E.164, e.g. +15551234567)
        <input name="whatsappNumber" defaultValue={clinic.whatsappNumber ?? ""} disabled={!isEditing} required />
      </label>
      <label>
        Timezone
        <input name="timezone" defaultValue={clinic.timezone} disabled={!isEditing} />
      </label>
      <label>
        Default language
        <select name="defaultLocale" defaultValue={clinic.defaultLocale} disabled={!isEditing}>
          <option value="AR">Arabic</option>
          <option value="EN">English</option>
        </select>
      </label>

      {isEditing ? (
        <button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </button>
      ) : (
        <button type="button" className="secondary" onClick={() => setIsEditing(true)}>
          Edit
        </button>
      )}
    </form>
  );
}
