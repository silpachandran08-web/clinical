import { z } from "zod";
import { prisma } from "./db/client";
import { generateSlotsForDoctor } from "./scheduling/slotGenerator";

/**
 * Framework-agnostic admin logic, called from Server Actions in app/admin/*
 * (and reusable from a future public API if clinics ever self-serve directly).
 */

export const createClinicSchema = z.object({
  name: z.string().min(1),
  whatsappNumber: z.string().min(1),
  timezone: z.string().optional(),
  defaultLocale: z.enum(["AR", "EN"]).optional(),
});

export const updateClinicSchema = createClinicSchema.extend({ id: z.string() });

export const createDepartmentSchema = z.object({
  clinicId: z.string(),
  name: z.string().min(1),
});

const workingHoursSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string(),
  endTime: z.string(),
  slotDurationMinutes: z.number().optional(),
});

export const createDoctorSchema = z.object({
  clinicId: z.string(),
  departmentId: z.string(),
  name: z.string().min(1),
  workingHours: z.array(workingHoursSchema).default([]),
});

export async function getFirstClinic() {
  return prisma.clinic.findFirst({ orderBy: { createdAt: "asc" } });
}

export async function createClinic(input: z.infer<typeof createClinicSchema>) {
  return prisma.clinic.create({ data: input });
}

export async function updateClinic(input: z.infer<typeof updateClinicSchema>) {
  const { id, ...data } = input;
  return prisma.clinic.update({ where: { id }, data });
}

export async function listDepartments(clinicId: string) {
  return prisma.department.findMany({ where: { clinicId }, orderBy: { name: "asc" } });
}

export async function createDepartment(input: z.infer<typeof createDepartmentSchema>) {
  return prisma.department.create({ data: input });
}

export async function listDoctors(clinicId: string) {
  return prisma.doctor.findMany({
    where: { clinicId },
    include: { department: true, workingHours: true },
    orderBy: { name: "asc" },
  });
}

export async function createDoctor(input: z.infer<typeof createDoctorSchema>) {
  const doctor = await prisma.doctor.create({
    data: {
      clinicId: input.clinicId,
      departmentId: input.departmentId,
      name: input.name,
      workingHours: {
        create: input.workingHours.map((wh) => ({
          dayOfWeek: wh.dayOfWeek,
          startTime: wh.startTime,
          endTime: wh.endTime,
          slotDurationMinutes: wh.slotDurationMinutes ?? 20,
        })),
      },
    },
    include: { workingHours: true, department: true },
  });

  const generatedSlots = await generateSlotsForDoctor(doctor.id);
  return { doctor, generatedSlots };
}

export async function setDoctorActive(doctorId: string, active: boolean) {
  return prisma.doctor.update({ where: { id: doctorId }, data: { active } });
}

export async function listPatients(clinicId: string) {
  return prisma.patient.findMany({
    where: { clinicId },
    include: { _count: { select: { appointments: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function listClinicAppointments(clinicId: string) {
  return prisma.appointment.findMany({
    where: { clinicId },
    include: { doctor: true, patient: true, slot: true },
    orderBy: { slot: { startsAt: "desc" } },
  });
}
