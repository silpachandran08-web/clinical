import { prisma } from "./db/client";
import { computeNextStageUpdate, loadStageAppointmentForStaff } from "./doctorHandlers";

// Caps a submitted field value's length — the only field type that gets
// anywhere near this is ATTACHMENT (a base64 data URL from
// AttachmentUploadField, which already resizes client-side to ~a few
// hundred KB); this only exists to reject a client that bypassed that
// resize, not a limit anyone should normally hit.
const MAX_FIELD_VALUE_LENGTH = 6_000_000;

/**
 * Required before a lab tech can send a patient on: validates every
 * `required` LabFieldDefinition for this lab has a non-empty submitted
 * value, records the result, then advances exactly like
 * advanceAppointmentStage. `values` is keyed by LabFieldDefinition id —
 * for ATTACHMENT fields the value is a data URL (see AttachmentUploadField).
 */
export async function recordLabResultAndAdvance(
  clinicId: string,
  labStaffId: string,
  appointmentId: string,
  values: Record<string, string>,
) {
  const appointment = await loadStageAppointmentForStaff(clinicId, labStaffId, appointmentId);

  const existing = await prisma.labResult.findUnique({ where: { appointmentId } });
  if (existing) {
    throw new Error("A result has already been recorded for this visit");
  }

  const definitions = await prisma.labFieldDefinition.findMany({
    where: { clinicId, departmentId: appointment.currentDepartmentId! },
    orderBy: { order: "asc" },
  });

  const missing = definitions.filter((d) => d.required && !values[d.id]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing required field(s): ${missing.map((d) => d.label).join(", ")}`);
  }
  const tooLong = Object.values(values).some((v) => v.length > MAX_FIELD_VALUE_LENGTH);
  if (tooLong) {
    throw new Error("One of the submitted values is too large");
  }

  const update = await computeNextStageUpdate(clinicId, appointment.doctor.departmentId, appointment.currentDepartmentId!);

  await prisma.$transaction([
    prisma.labResult.create({
      data: {
        appointmentId,
        labStaffId,
        patientId: appointment.patientId,
        departmentId: appointment.currentDepartmentId!,
        values: {
          create: definitions
            .filter((d) => values[d.id]?.trim())
            .map((d) => ({ fieldDefinitionId: d.id, textValue: values[d.id] })),
        },
      },
    }),
    prisma.appointment.update({ where: { id: appointmentId }, data: update }),
  ]);
}
