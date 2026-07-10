import { redirect } from "next/navigation";
import { ensureWhatsAppVerifyToken, getClinic } from "@/src/adminHandlers";
import { savePosSettingsAction } from "@/lib/actions/billing";
import { getSession } from "@/lib/session";
import { ClinicProfileForm } from "./ClinicProfileForm";
import { WhatsAppCredentialsForm } from "./WhatsAppCredentialsForm";

export default async function ClinicPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const clinic = await getClinic(session.clinicId);
  const verifyToken = await ensureWhatsAppVerifyToken(session.clinicId);

  return (
    <div>
      <h1>Clinic profile</h1>
      {!clinic.whatsappNumber && (
        <p className="muted">
          Set your WhatsApp number below — that's the number patients message to reach the assistant.
        </p>
      )}
      <div className="card">
        <ClinicProfileForm clinic={clinic} />
      </div>

      <div className="card">
        <h2>Payments &amp; POS terminal</h2>
        <p className="muted">
          How card payments are collected at the front desk. With <strong>Manual POS</strong>, staff
          charge your existing bank terminal (any mada terminal works) and record the approval code
          in the Billing tab. Direct terminal integrations with Riyadh acquirers (Geidea, Neoleap /
          Al Rajhi) — where the amount is pushed to the device automatically — will appear here once
          available.
        </p>
        <form action={savePosSettingsAction} className="stack">
          <label>
            Payment provider
            <select name="posProvider" defaultValue={clinic.posProvider}>
              <option value="MANUAL">Manual POS — any bank terminal</option>
              <option value="GEIDEA" disabled>
                Geidea terminal API (coming soon)
              </option>
              <option value="NEOLEAP" disabled>
                Neoleap / Al Rajhi terminal API (coming soon)
              </option>
            </select>
          </label>
          <label>
            Terminal name (optional)
            <input
              name="posTerminalName"
              defaultValue={clinic.posTerminalName ?? ""}
              placeholder='e.g. "Front desk mada terminal — Riyad Bank"'
            />
          </label>
          <button type="submit">Save payment settings</button>
        </form>
      </div>

      <div className="card">
        <h2>WhatsApp API credentials</h2>
        <WhatsAppCredentialsForm
          phoneNumberId={clinic.whatsappPhoneNumberId}
          hasAccessToken={Boolean(clinic.whatsappAccessToken)}
          hasAppSecret={Boolean(clinic.whatsappAppSecret)}
          verifyToken={verifyToken}
        />
      </div>
    </div>
  );
}
