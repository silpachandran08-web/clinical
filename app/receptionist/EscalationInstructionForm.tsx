"use client";

import { useState, useTransition } from "react";
import { sendStaffInstructionAction } from "@/lib/actions/receptionist";

/**
 * The alternative to "Reply on WhatsApp": staff describe what should happen
 * in plain English and the AI carries it out with the real booking tools
 * (not just a canned reply) and sends the result itself. On success the
 * escalation resolves and this row disappears from the page — that's the
 * confirmation, no separate success state needed.
 */
export function EscalationInstructionForm({ escalationId }: { escalationId: string }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const instruction = value.trim();
    if (!instruction) return;

    setError(null);
    const formData = new FormData();
    formData.set("escalationId", escalationId);
    formData.set("instruction", instruction);

    startTransition(async () => {
      try {
        await sendStaffInstructionAction(formData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send — try again");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="escalation-instruct-form">
      <input
        type="text"
        placeholder="Tell the AI what to do — e.g. “Book her the earliest Dr. Fathima slot tomorrow”"
        value={value}
        onChange={(ev) => setValue(ev.target.value)}
        disabled={pending}
      />
      <button type="submit" className="secondary" disabled={pending || !value.trim()}>
        {pending ? "Sending…" : "Send to AI"}
      </button>
      {error && (
        <p className="error" style={{ fontSize: 11.5, margin: "4px 0 0", flexBasis: "100%" }}>
          {error}
        </p>
      )}
    </form>
  );
}
