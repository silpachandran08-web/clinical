import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { calculateAge, getConsultationForPrint, parseMedicineList } from "@/src/doctorHandlers";
import { PrintButton } from "./PrintButton";

const GENDER_LABEL: Record<string, string> = { MALE: "Male", FEMALE: "Female", OTHER: "Other" };

export default async function PrescriptionPrintPage({
  params,
}: {
  params: Promise<{ consultationId: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "DOCTOR" || !session.doctorId) redirect("/login");

  const { consultationId } = await params;
  const consultation = await getConsultationForPrint(session.clinicId, session.doctorId, consultationId);
  if (!consultation) redirect("/doctor");

  const { patient, doctor } = consultation;
  const clinic = doctor.clinic;
  const medicines = parseMedicineList(consultation.prescription);
  const administered = parseMedicineList(consultation.administeredTreatment);
  const age = calculateAge(patient.birthYear);

  return (
    <div>
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "0 0 16px" }}>
        <Link href="/doctor">← Back</Link>
        <PrintButton />
      </div>

      <div className="rx-sheet">
        <div className="rx-header">
          <div className="rx-clinic-name">{clinic.name}</div>
          {(clinic.address || clinic.phone) && (
            <div className="rx-clinic-contact">
              {[clinic.address, clinic.phone].filter(Boolean).join(" · ")}
            </div>
          )}
        </div>

        <div className="rx-meta">
          <div>
            <div className="rx-meta-label">Doctor</div>
            <div className="rx-meta-value">
              Dr. {doctor.name}
              {doctor.department && <span className="muted"> — {doctor.department.name}</span>}
            </div>
          </div>
          <div>
            <div className="rx-meta-label">Date</div>
            <div className="rx-meta-value">
              {consultation.createdAt.toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
                timeZone: clinic.timezone,
              })}
            </div>
          </div>
        </div>

        <div className="rx-meta">
          <div>
            <div className="rx-meta-label">Patient</div>
            <div className="rx-meta-value">{patient.name ?? patient.phone}</div>
          </div>
          <div>
            <div className="rx-meta-label">Age / Gender</div>
            <div className="rx-meta-value">
              {age ?? "—"}
              {patient.gender ? ` / ${GENDER_LABEL[patient.gender]}` : ""}
            </div>
          </div>
        </div>

        <div className="rx-symbol">℞</div>

        {medicines.length === 0 ? (
          <p className="muted">No take-home medicines prescribed.</p>
        ) : (
          <ol className="rx-medicines">
            {medicines.map((m, i) => (
              <li key={i}>
                <span className="rx-medicine-name">{m.name}</span>
                {m.detail && <span className="rx-medicine-detail"> — {m.detail}</span>}
              </li>
            ))}
          </ol>
        )}

        {administered.length > 0 && (
          <div className="rx-section">
            <div className="rx-section-title">Administered at clinic today</div>
            <ul className="rx-medicines">
              {administered.map((m, i) => (
                <li key={i}>
                  <span className="rx-medicine-name">{m.name}</span>
                  {m.detail && <span className="rx-medicine-detail"> — {m.detail}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {consultation.followUpDate && (
          <p className="rx-followup">
            Please return on{" "}
            {consultation.followUpDate.toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
              timeZone: clinic.timezone,
            })}
            .
          </p>
        )}

        <div className="rx-footer">
          <div className="rx-signature-line" />
          <div className="rx-meta-label">Dr. {doctor.name}</div>
        </div>
      </div>
    </div>
  );
}
