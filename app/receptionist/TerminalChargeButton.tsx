"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { pollTerminalChargeAction, startTerminalChargeAction } from "@/lib/actions/billing";

const POLL_INTERVAL_MS = 2500;
// Client-side cap only; the server independently fails charges after 3 min.
const MAX_POLLS = 60;

type Phase = "idle" | "sending" | "waiting" | "paid" | "failed";

/**
 * One-click "charge on POS": pushes the outstanding balance to the physical
 * terminal, then polls until the patient taps their card and the acquirer
 * answers. On success the page refreshes and the row flips to Paid.
 */
export function TerminalChargeButton({
  appointmentId,
  amountLabel,
  terminalLabel,
}: {
  appointmentId: string;
  amountLabel: string;
  terminalLabel: string;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const paymentIdRef = useRef<string | null>(null);
  const pollCountRef = useRef(0);
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);

  async function poll() {
    if (!activeRef.current || !paymentIdRef.current) return;
    pollCountRef.current += 1;
    const result = await pollTerminalChargeAction(paymentIdRef.current);
    if (!activeRef.current) return;

    if (result.status === "PAID") {
      setPhase("paid");
      router.refresh();
      return;
    }
    if (result.status === "FAILED" || result.error) {
      setPhase("failed");
      setError(result.failureReason ?? result.error ?? "Payment failed");
      return;
    }
    if (pollCountRef.current >= MAX_POLLS) {
      setPhase("failed");
      setError("Timed out waiting for the card — try again or record manually");
      return;
    }
    setTimeout(poll, POLL_INTERVAL_MS);
  }

  async function charge() {
    setPhase("sending");
    setError(null);
    pollCountRef.current = 0;

    const result = await startTerminalChargeAction(appointmentId);
    if (!activeRef.current) return;

    if (result.error || !result.paymentId) {
      setPhase("failed");
      setError(result.error ?? "Could not start the charge");
      return;
    }
    paymentIdRef.current = result.paymentId;

    if (result.status === "PAID") {
      setPhase("paid");
      router.refresh();
      return;
    }
    setPhase("waiting");
    setTimeout(poll, POLL_INTERVAL_MS);
  }

  if (phase === "paid") {
    return (
      <span className="badge success" style={{ alignSelf: "center" }}>
        Payment approved
      </span>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={charge}
          disabled={phase === "sending" || phase === "waiting"}
        >
          {phase === "sending"
            ? "Sending to terminal…"
            : phase === "waiting"
              ? "Waiting for card…"
              : phase === "failed"
                ? `Retry ${amountLabel} on POS`
                : `Charge ${amountLabel} on POS`}
        </button>
        {phase === "waiting" && (
          <span className="muted" style={{ fontSize: 12 }}>
            Amount sent to {terminalLabel} — ask the patient to tap their card.
          </span>
        )}
      </div>
      {error && (
        <span className="error" style={{ fontSize: 12, margin: 0 }}>
          {error}
        </span>
      )}
    </div>
  );
}
