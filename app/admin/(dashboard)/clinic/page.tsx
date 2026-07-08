import { getFirstClinic } from "@/src/adminHandlers";
import { saveClinicAction } from "@/lib/actions/clinic";

export default async function ClinicPage() {
  const clinic = await getFirstClinic();

  return (
    <div>
      <h1>Clinic profile</h1>
      {!clinic && (
        <p className="muted">
          No clinic yet — this is a one-time setup step. Once created, the WhatsApp number below is
          what patients message to reach the assistant.
        </p>
      )}
      <div className="card">
        <form action={saveClinicAction} className="stack">
          <input type="hidden" name="id" defaultValue={clinic?.id} />
          <label>
            Clinic name
            <input name="name" defaultValue={clinic?.name} required />
          </label>
          <label>
            WhatsApp number (clean E.164, e.g. +15551234567)
            <input name="whatsappNumber" defaultValue={clinic?.whatsappNumber} required />
          </label>
          <label>
            Timezone
            <input name="timezone" defaultValue={clinic?.timezone ?? "Asia/Riyadh"} />
          </label>
          <label>
            Default language
            <select name="defaultLocale" defaultValue={clinic?.defaultLocale ?? "AR"}>
              <option value="AR">Arabic</option>
              <option value="EN">English</option>
            </select>
          </label>
          <button type="submit">{clinic ? "Save changes" : "Create clinic"}</button>
        </form>
      </div>
    </div>
  );
}
