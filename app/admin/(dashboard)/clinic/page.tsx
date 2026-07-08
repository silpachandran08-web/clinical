import { redirect } from "next/navigation";
import { getClinic } from "@/src/adminHandlers";
import { getSession } from "@/lib/session";
import { ClinicProfileForm } from "./ClinicProfileForm";

export default async function ClinicPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const clinic = await getClinic(session.clinicId);

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
    </div>
  );
}
