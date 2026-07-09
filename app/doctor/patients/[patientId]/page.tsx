import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getClinic } from "@/src/adminHandlers";
import { calculateAge, listPatientHistory } from "@/src/doctorHandlers";
import { prisma } from "@/src/db/client";
import { PatientDetailsForm } from "./PatientDetailsForm";
import { WeightChart } from "./WeightChart";
import { ScaleIcon } from "../../../DashboardIcons";

export default async function PatientHistoryPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "DOCTOR") redirect("/login");

  const { patientId } = await params;
  const patient = await prisma.patient.findFirst({ where: { id: patientId, clinicId: session.clinicId } });
  if (!patient) redirect("/doctor");

  const clinic = await getClinic(session.clinicId);
  const history = await listPatientHistory(session.clinicId, patientId);

  const weightPoints = history
    .filter((c) => c.weightKg != null)
    .map((c) => ({ date: c.createdAt, weightKg: c.weightKg as number }))
    .reverse() // history is newest-first; the chart reads oldest-to-newest
    .slice(-8);

  return (
    <div>
      <p>
        <Link href="/doctor">&larr; Back to queue</Link>
      </p>
      <h1>{patient.name ?? patient.phone}</h1>
      <p className="muted">{patient.phone}</p>

      <div className="card">
        <h2>Patient details</h2>
        <PatientDetailsForm
          patientId={patient.id}
          age={calculateAge(patient.birthYear)}
          gender={patient.gender}
          medicalNotes={patient.medicalNotes}
        />
      </div>

      {weightPoints.length >= 2 && (
        <div className="card">
          <h2 className="card-title-icon">
            <ScaleIcon /> Weight trend
          </h2>
          <WeightChart points={weightPoints} />
        </div>
      )}

      <div className="card">
        <h2>Visit history</h2>
        {history.length === 0 ? (
          <p className="empty-state">No prior visits on record.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Doctor</th>
                <th>Weight</th>
                <th>Notes</th>
                <th>Prescription</th>
                <th>Administered</th>
                <th>Follow-up</th>
              </tr>
            </thead>
            <tbody>
              {history.map((c) => (
                <tr key={c.id}>
                  <td>{c.createdAt.toLocaleDateString(undefined, { timeZone: clinic.timezone })}</td>
                  <td>{c.doctor.name}</td>
                  <td>{c.weightKg != null ? `${c.weightKg} kg` : "—"}</td>
                  <td>{c.notes ?? "—"}</td>
                  <td>{c.prescription ?? "—"}</td>
                  <td>{c.administeredTreatment ?? "—"}</td>
                  <td>{c.followUpDate ? c.followUpDate.toLocaleDateString(undefined, { timeZone: clinic.timezone }) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
