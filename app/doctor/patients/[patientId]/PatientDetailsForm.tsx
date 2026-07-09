"use client";

import { useState, useTransition } from "react";
import { updatePatientDetailsAction } from "@/lib/actions/doctor";

const GENDER_LABELS: Record<string, string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
};

export function PatientDetailsForm({
  patientId,
  age,
  gender,
  medicalNotes,
}: {
  patientId: string;
  age: number | null;
  gender: string | null;
  medicalNotes: string | null;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await updatePatientDetailsAction(formData);
      setIsEditing(false);
    });
  }

  if (!isEditing) {
    return (
      <div>
        <div className="stack" style={{ gap: 6, marginBottom: 14 }}>
          <p style={{ margin: 0 }}>
            <span className="muted">Age:</span> {age ?? "—"}
          </p>
          <p style={{ margin: 0 }}>
            <span className="muted">Gender:</span> {gender ? GENDER_LABELS[gender] : "—"}
          </p>
          <p style={{ margin: 0 }}>
            <span className="muted">Medical notes:</span> {medicalNotes || "—"}
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
      <input type="hidden" name="patientId" value={patientId} />
      <label>
        Age
        <input name="age" type="number" min={0} max={130} defaultValue={age ?? ""} />
      </label>
      <label>
        Gender
        <select name="gender" defaultValue={gender ?? ""}>
          <option value="">Not set</option>
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
          <option value="OTHER">Other</option>
        </select>
      </label>
      <label>
        Medical notes
        <textarea name="medicalNotes" defaultValue={medicalNotes ?? ""} rows={4} placeholder="Allergies, chronic conditions…" />
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
