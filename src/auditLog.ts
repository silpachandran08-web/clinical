import { prisma } from "@/src/db/client";

export interface AuditEntry {
  clinicId: string;
  userId?: string | null;
  action: string; // e.g. "patient.search", "appointment.cancel"
  entity: string; // e.g. "Patient", "Appointment"
  entityId?: string | null;
  detail?: string | null; // already-masked free text — never raw PII
}

/**
 * Append-only audit trail for access to patient-identifiable data.
 * Deliberately fire-and-forget at call sites via logAuditSafe(): an audit
 * insert failing must never break the staff action it was recording.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  await prisma.auditLog.create({
    data: {
      clinicId: entry.clinicId,
      userId: entry.userId ?? null,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      detail: entry.detail ?? null,
    },
  });
}

export async function logAuditSafe(entry: AuditEntry): Promise<void> {
  try {
    await logAudit(entry);
  } catch (err) {
    console.error("Audit log write failed", err);
  }
}
