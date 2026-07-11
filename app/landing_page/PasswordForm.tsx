"use client";

import { useActionState } from "react";
import { verifyLandingPasswordAction } from "@/lib/actions/landingAdmin";
import { initialLandingAdminState } from "@/lib/landingAdminFormState";

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(verifyLandingPasswordAction, initialLandingAdminState);

  return (
    <div className="container" style={{ maxWidth: 380, marginTop: 80 }}>
      <div className="card">
        <h1>Landing page admin</h1>
        <p className="muted">Enter the password to manage which landing design is live.</p>

        <form action={formAction} className="stack" style={{ marginTop: 16 }}>
          <label>
            Password
            <input type="password" name="password" required autoFocus />
          </label>

          {state.error && <p className="error">{state.error}</p>}

          <button type="submit" disabled={pending}>
            {pending ? "Checking…" : "Unlock"}
          </button>
        </form>
      </div>
    </div>
  );
}
