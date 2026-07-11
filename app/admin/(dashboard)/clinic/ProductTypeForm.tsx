"use client";

import { useState, useTransition } from "react";
import { saveIntegrationModeAction } from "@/lib/actions/integration";

type IntegrationMode = "NATIVE" | "CUSTOM_API";

export function ProductTypeForm({ integrationMode }: { integrationMode: IntegrationMode }) {
  const [mode, setMode] = useState<IntegrationMode>(integrationMode);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSubmit(formData: FormData) {
    setSaved(false);
    startTransition(async () => {
      await saveIntegrationModeAction(formData);
      setSaved(true);
    });
  }

  return (
    <form action={handleSubmit} className="stack">
      <label>
        <input
          type="radio"
          name="integrationMode"
          value="NATIVE"
          checked={mode === "NATIVE"}
          onChange={() => setMode("NATIVE")}
        />{" "}
        <strong>Full platform</strong> — we host your patients, doctors, and appointments
      </label>
      <label>
        <input
          type="radio"
          name="integrationMode"
          value="CUSTOM_API"
          checked={mode === "CUSTOM_API"}
          onChange={() => setMode("CUSTOM_API")}
        />{" "}
        <strong>Connect your own system</strong> — WhatsApp AI only, your booking data stays where it is
      </label>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save product type"}
        </button>
        {saved && !pending && (
          <span style={{ color: "var(--success)", fontSize: 13, fontWeight: 500 }}>Saved.</span>
        )}
      </div>
    </form>
  );
}
