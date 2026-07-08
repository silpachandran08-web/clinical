"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAction } from "@/lib/actions/auth";
import { initialAuthState } from "@/lib/authFormState";

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(registerAction, initialAuthState);

  return (
    <div className="container" style={{ maxWidth: 380, marginTop: 80 }}>
      <div className="card">
        <h1>Register your clinic</h1>
        <p className="muted">
          Start a 7-day free trial. No password — we&apos;ll email you a one-time code to sign in.
        </p>

        <form action={formAction} className="stack" style={{ marginTop: 16 }}>
          <input type="hidden" name="step" value={state.step} />
          {state.step === "code" && (
            <>
              <input type="hidden" name="email" value={state.email} />
              <input type="hidden" name="clinicName" value={state.clinicName} />
            </>
          )}

          {state.step === "start" ? (
            <>
              <label>
                Clinic name
                <input type="text" name="clinicName" defaultValue={state.clinicName} required autoFocus />
              </label>
              <label>
                Email
                <input type="email" name="email" defaultValue={state.email} required />
              </label>
            </>
          ) : (
            <>
              <p className="muted">
                Code sent to <strong>{state.email}</strong>. In dev mode (no email provider
                configured), check the server logs for the code.
              </p>
              <label>
                6-digit code
                <input type="text" name="code" inputMode="numeric" maxLength={6} required autoFocus />
              </label>
            </>
          )}

          {state.error && <p className="error">{state.error}</p>}

          <button type="submit" disabled={pending}>
            {state.step === "start" ? "Send code" : "Verify & create clinic"}
          </button>
        </form>

        <p className="muted" style={{ marginTop: 16 }}>
          Already registered? <Link href="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
