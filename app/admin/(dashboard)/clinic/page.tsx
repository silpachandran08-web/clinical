import { redirect } from "next/navigation";
import { ensureWhatsAppVerifyToken, getClinic } from "@/src/adminHandlers";
import { getSession } from "@/lib/session";
import { ClinicProfileForm } from "./ClinicProfileForm";
import { PosSettingsForm } from "./PosSettingsForm";
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
          in the Billing tab. Pick <strong>Geidea</strong> or <strong>Neoleap (Al Rajhi)</strong> —
          the two most common terminal suppliers in Riyadh — and enter the API credentials from
          your merchant agreement, and the Billing tab gets a one-click Charge button that pushes
          the amount straight to the terminal and marks the visit paid when the card is approved.
        </p>
        <PosSettingsForm
          posProvider={clinic.posProvider}
          posTerminalName={clinic.posTerminalName}
          posMerchantId={clinic.posMerchantId}
          posTerminalId={clinic.posTerminalId}
          hasApiKey={Boolean(clinic.posApiKey)}
          hasApiSecret={Boolean(clinic.posApiSecret)}
        />
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
