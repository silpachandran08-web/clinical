"use client";

import { useState, useTransition } from "react";
import { cancelAppointmentAction } from "@/lib/actions/receptionist";

export function CancelAppointmentButton({ appointmentId }: { appointmentId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (!window.confirm("Cancel this appointment? This frees up the slot for someone else.")) return;
    setError(null);
    const formData = new FormData();
    formData.set("appointmentId", appointmentId);
    startTransition(async () => {
      try {
        await cancelAppointmentAction(formData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to cancel — try again");
      }
    });
  }

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        style={{
          fontSize: 11,
          padding: "4px 8px",
          background: "transparent",
          color: "var(--danger)",
          border: "1px solid var(--danger-soft)",
          borderRadius: 3,
          cursor: pending ? "default" : "pointer",
          fontWeight: 600,
          whiteSpace: "nowrap",
        }}
      >
        {pending ? "Cancelling…" : "Cancel"}
      </button>
      {error && (
        <span className="error" style={{ fontSize: 10.5 }}>
          {error}
        </span>
      )}
    </span>
  );
}
