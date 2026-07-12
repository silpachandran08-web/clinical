import Link from "next/link";
import { redirect } from "next/navigation";
import { listDepartments, listFlowSteps } from "@/src/adminHandlers";
import { getSession } from "@/lib/session";
import { FlowEditor } from "./FlowEditor";

export default async function FlowPage({
  searchParams,
}: {
  searchParams: Promise<{ dept?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const departments = await listDepartments(session.clinicId);

  if (departments.length === 0) {
    return (
      <div>
        <h1>Flow</h1>
        <div className="card">
          <p className="empty-state">
            Add at least one department first — see{" "}
            <Link href="/admin/departments">Departments</Link>.
          </p>
        </div>
      </div>
    );
  }

  const selectedDeptId = params.dept && departments.some((d) => d.id === params.dept)
    ? params.dept
    : departments[0].id;
  const selectedDept = departments.find((d) => d.id === selectedDeptId)!;
  const steps = await listFlowSteps(session.clinicId, selectedDeptId);

  return (
    <div>
      <h1>Flow</h1>
      <p className="muted" style={{ marginTop: -8, marginBottom: 16 }}>
        Choose a department, then arrange which departments a patient's visit passes through between
        reception and the doctor — e.g. Reception → Nurse → Doctor.
      </p>

      <div className="card">
        <h2>Department</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {departments.map((d) => (
            <Link
              key={d.id}
              href={`/admin/flow?dept=${d.id}`}
              className={`badge ${d.id === selectedDeptId ? "info" : ""}`}
              style={{ textDecoration: "none" }}
            >
              {d.name}
            </Link>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>{selectedDept.name}&apos;s flow</h2>
        <FlowEditor
          // Re-key on the selected dept so useState(initialStageIds) actually
          // re-initializes when the picker switches between departments —
          // otherwise the client component keeps the previous dept's state
          // and looks "reverted" until a hard reload.
          key={selectedDeptId}
          ownerDepartmentId={selectedDeptId}
          allDepartments={departments.map((d) => ({ id: d.id, name: d.name }))}
          initialStageIds={steps.map((s) => s.stageDepartmentId)}
        />
      </div>
    </div>
  );
}
