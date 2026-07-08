import { redirect } from "next/navigation";
import { getClinic } from "@/src/adminHandlers";
import { saveClinicAction } from "@/lib/actions/clinic";
import { getSession } from "@/lib/session";

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
        <form action={saveClinicAction} className="stack">
          <label>
            Clinic name
            <input name="name" defaultValue={clinic.name} required />
          </label>
          <label>
            WhatsApp number (clean E.164, e.g. +15551234567)
            <input name="whatsappNumber" defaultValue={clinic.whatsappNumber ?? ""} required />
          </label>
          <label>
            Timezone
            <input name="timezone" defaultValue={clinic.timezone} />
          </label>
          <label>
            Default language
            <select name="defaultLocale" defaultValue={clinic.defaultLocale}>
              <option value="AR">Arabic</option>
              <option value="EN">English</option>
            </select>
          </label>
          <button type="submit">Save changes</button>
        </form>
      </div>
    </div>
  );
}
