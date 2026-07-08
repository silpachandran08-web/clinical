import { z } from "zod";
import { prisma } from "./db/client.js";
import { generateSlotsForDoctor } from "./scheduling/slotGenerator.js";

/**
 * Framework-agnostic admin logic, shared by the local Fastify server
 * (src/routes/admin.ts) and the Vercel serverless entry points (api/admin/*.ts).
 */

export const createClinicSchema = z.object({
  name: z.string(),
  whatsappNumber: z.string(),
  timezone: z.string().optional(),
  defaultLocale: z.enum(["AR", "EN"]).optional(),
});

export const createDoctorSchema = z.object({
  clinicId: z.string(),
  name: z.string(),
  specialty: z.string(),
  workingHours: z
    .array(
      z.object({
        dayOfWeek: z.number().min(0).max(6),
        startTime: z.string(),
        endTime: z.string(),
        slotDurationMinutes: z.number().optional(),
      }),
    )
    .default([]),
});

export async function createClinic(input: z.infer<typeof createClinicSchema>) {
  return prisma.clinic.create({ data: input });
}

export async function createDoctor(input: z.infer<typeof createDoctorSchema>) {
  const doctor = await prisma.doctor.create({
    data: {
      clinicId: input.clinicId,
      name: input.name,
      specialty: input.specialty,
      workingHours: {
        create: input.workingHours.map((wh) => ({
          dayOfWeek: wh.dayOfWeek,
          startTime: wh.startTime,
          endTime: wh.endTime,
          slotDurationMinutes: wh.slotDurationMinutes ?? 20,
        })),
      },
    },
    include: { workingHours: true },
  });

  const generatedSlots = await generateSlotsForDoctor(doctor.id);
  return { doctor, generatedSlots };
}

export async function listClinicAppointments(clinicId: string) {
  return prisma.appointment.findMany({
    where: { clinicId, status: "CONFIRMED" },
    include: { doctor: true, patient: true, slot: true },
    orderBy: { slot: { startsAt: "asc" } },
  });
}
