import { z } from "zod";
import { prisma } from "./db/client";
import { generateSlotsForDoctor } from "./scheduling/slotGenerator";

/**
 * Framework-agnostic admin logic, called from Server Actions in app/admin/*.
 *
 * Security note: every function here takes `clinicId` as an explicit
 * parameter that Server Actions must derive from the verified session
 * (lib/session.ts), never from client-submitted form data. This is what
 * actually enforces tenant isolation now that clinics are real, separate
 * customers instead of one trusted operator — a hidden `clinicId` form
 * field would let one clinic write into another's data by editing HTML.
 */

export const updateClinicSchema = z.object({
  name: z.string().min(1),
  whatsappNumber: z.string().min(1),
  timezone: z.string().optional(),
  defaultLocale: z.enum(["AR", "EN"]).optional(),
});

export const createDepartmentSchema = z.object({
  name: z.string().min(1),
});

const workingHoursSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string(),
  endTime: z.string(),
  slotDurationMinutes: z.number().optional(),
});

export const createDoctorSchema = z.object({
  departmentId: z.string(),
  name: z.string().min(1),
  workingHours: z.array(workingHoursSchema).default([]),
});

export const inviteStaffSchema = z.object({
  email: z.string().email(),
  role: z.enum(["RECEPTIONIST", "DOCTOR"]),
  doctorId: z.string().optional(),
});

export async function getClinic(clinicId: string) {
  return prisma.clinic.findUniqueOrThrow({ where: { id: clinicId } });
}

export async function updateClinic(clinicId: string, input: z.infer<typeof updateClinicSchema>) {
  return prisma.clinic.update({ where: { id: clinicId }, data: input });
}

export async function listDepartments(clinicId: string) {
  return prisma.department.findMany({ where: { clinicId }, orderBy: { name: "asc" } });
}

export async function createDepartment(clinicId: string, input: z.infer<typeof createDepartmentSchema>) {
  return prisma.department.create({ data: { clinicId, name: input.name } });
}

export async function listDoctors(clinicId: string) {
  return prisma.doctor.findMany({
    where: { clinicId },
    include: { department: true, workingHours: true, user: true },
    orderBy: { name: "asc" },
  });
}

export async function createDoctor(clinicId: string, input: z.infer<typeof createDoctorSchema>) {
  const doctor = await prisma.doctor.create({
    data: {
      clinicId,
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

export async function setDoctorActive(clinicId: string, doctorId: string, active: boolean) {
  return prisma.doctor.updateMany({ where: { id: doctorId, clinicId }, data: { active } });
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

export async function listStaff(clinicId: string) {
  return prisma.user.findMany({
    where: { clinicId },
    include: { doctor: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function inviteStaff(clinicId: string, input: z.infer<typeof inviteStaffSchema>) {
  if (input.role === "DOCTOR" && !input.doctorId) {
    throw new Error("A doctor login must be linked to a doctor record");
  }
  return prisma.user.create({
    data: {
      clinicId,
      email: input.email.trim().toLowerCase(),
      role: input.role,
      doctorId: input.role === "DOCTOR" ? input.doctorId : undefined,
    },
  });
}
