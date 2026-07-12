import { z } from "zod";
import { prisma } from "./db/client";
import { computeNextStageUpdate, loadStageAppointmentForStaff } from "./doctorHandlers";

export const recordVitalsSchema = z.object({
  bloodPressure: z.string().min(1),
  heightCm: z.coerce.number().positive(),
  weightKg: z.coerce.number().positive(),
  temperatureC: z.coerce.number().optional(),
  pulseBpm: z.coerce.number().int().positive().optional(),
  notes: z.string().optional(),
});

/**
 * Required before a nurse can send a patient on: records vitals for this
 * appointment, then advances it exactly like advanceAppointmentStage. One
 * NurseVisit per appointment — re-submitting throws a clear error rather
 * than a raw unique-constraint failure.
 */
export async function recordVitalsAndAdvance(
  clinicId: string,
  nurseId: string,
  appointmentId: string,
  input: z.infer<typeof recordVitalsSchema>,
) {
  const appointment = await loadStageAppointmentForStaff(clinicId, nurseId, appointmentId);

  const existing = await prisma.nurseVisit.findUnique({ where: { appointmentId } });
  if (existing) {
    throw new Error("Vitals already recorded for this visit");
  }

  const update = await computeNextStageUpdate(clinicId, appointment.doctor.departmentId, appointment.currentDepartmentId!);

  await prisma.$transaction([
    prisma.nurseVisit.create({
      data: {
        appointmentId,
        nurseId,
        patientId: appointment.patientId,
        bloodPressure: input.bloodPressure,
        heightCm: input.heightCm,
        weightKg: input.weightKg,
        temperatureC: input.temperatureC,
        pulseBpm: input.pulseBpm,
        notes: input.notes,
      },
    }),
    prisma.appointment.update({ where: { id: appointmentId }, data: update }),
  ]);
}
