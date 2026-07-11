import { redirect } from "next/navigation";
import { ensureWhatsAppVerifyToken, getClinic } from "@/src/adminHandlers";
import { customApiConfigSchema } from "@/src/integrations/customApiConfig";
import { getSession } from "@/lib/session";
import { ClinicProfileForm } from "./ClinicProfileForm";
import { IntegrationSettingsForm } from "./IntegrationSettingsForm";
import { PosSettingsForm } from "./PosSettingsForm";
import { ProductTypeForm } from "./ProductTypeForm";
import { WhatsAppCredentialsForm } from "./WhatsAppCredentialsForm";

export default async function ClinicPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const clinic = await getClinic(session.clinicId);
  const verifyToken = await ensureWhatsAppVerifyToken(session.clinicId);
  const parsedIntegrationConfig = customApiConfigSchema.safeParse(clinic.integrationConfig);
  const integrationConfig = parsedIntegrationConfig.success ? parsedIntegrationConfig.data : null;

  return (
    <div>
      <h1>Clinic profile</h1>
      {!clinic.whatsappNumber && (
        <p className="muted">
          Set your WhatsApp number below — that's the number patients message to reach the assistant.
        </p>
      )}

      <div className="card">
        <h2>Product type</h2>
        <p className="muted">
          Full platform: your patients, doctors, and appointments live in our system. Connect your own system: the
          WhatsApp AI talks to your existing booking system over its API instead — your Admin/Receptionist
          dashboards here stay unused for booking data, since that lives in your own software.
        </p>
        <ProductTypeForm integrationMode={clinic.integrationMode === "CUSTOM_API" ? "CUSTOM_API" : "NATIVE"} />
      </div>

      {clinic.integrationMode === "CUSTOM_API" && (
        <div className="card">
          <h2>External System Integration</h2>
          <IntegrationSettingsForm
            initialConfig={integrationConfig}
            hasApiKey={integrationConfig?.auth.type === "API_KEY"}
            hasBearerToken={integrationConfig?.auth.type === "BEARER"}
            hasBasicPassword={integrationConfig?.auth.type === "BASIC"}
          />
        </div>
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
