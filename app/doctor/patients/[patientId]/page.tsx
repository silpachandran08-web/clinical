import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { listPatientHistory } from "@/src/doctorHandlers";
import { prisma } from "@/src/db/client";

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

  const history = await listPatientHistory(session.clinicId, patientId);

  return (
    <div>
      <p>
        <Link href="/doctor">&larr; Back to queue</Link>
      </p>
      <h1>{patient.name ?? patient.phone}</h1>
      <p className="muted">{patient.phone}</p>

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
                <th>Notes</th>
                <th>Prescription</th>
              </tr>
            </thead>
            <tbody>
              {history.map((c) => (
                <tr key={c.id}>
                  <td>{c.createdAt.toLocaleDateString()}</td>
                  <td>{c.doctor.name}</td>
                  <td>{c.notes ?? "—"}</td>
                  <td>{c.prescription ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
