"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "@/lib/actions/auth";
import { initialAuthState } from "@/lib/authFormState";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialAuthState);

  return (
    <div className="container" style={{ maxWidth: 380, marginTop: 80 }}>
      <div className="card">
        <h1>Sign in</h1>
        <p className="muted">We&apos;ll email you a one-time code — no password needed.</p>

        <form action={formAction} className="stack" style={{ marginTop: 16 }}>
          <input type="hidden" name="step" value={state.step} />
          {state.step === "code" && <input type="hidden" name="email" value={state.email} />}

          {state.step === "start" ? (
            <label>
              Email
              <input type="email" name="email" defaultValue={state.email} required autoFocus />
            </label>
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
            {state.step === "start" ? "Send code" : "Verify & sign in"}
          </button>
        </form>

        <p className="muted" style={{ marginTop: 16 }}>
          New clinic? <Link href="/register">Register here</Link>
        </p>
      </div>
    </div>
  );
}
