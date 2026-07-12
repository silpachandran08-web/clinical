import crypto from "node:crypto";
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

/**
 * Strips everything but digits and re-adds a single leading "+" — however
 * the admin types/pastes it ("+1 (555) 194-9076", "1 555 194 9076)", etc.),
 * this always lands on the exact clean E.164 shape that inbound webhook
 * lookups compare against (see normalizePhone in metaCloudProvider.ts).
 * Without this, a stray space or missing "+" silently breaks WhatsApp
 * routing with no validation error to catch it.
 */
function normalizeWhatsAppNumber(raw: string): string {
  return `+${raw.replace(/[^\d]/g, "")}`;
}

export const updateClinicSchema = z.object({
  name: z.string().min(1),
  whatsappNumber: z.string().min(1).transform(normalizeWhatsAppNumber),
  address: z.string().optional(),
  phone: z.string().optional(),
  receptionistName: z.string().optional(),
  timezone: z.string().optional(),
  defaultLocale: z.enum(["AR", "EN"]).optional(),
  isOpen24_7: z.boolean().optional(),
  openingTime: z.string().regex(/^\d{2}:\d{2}$/).optional(), // HH:MM format
  closingTime: z.string().regex(/^\d{2}:\d{2}$/).optional(), // HH:MM format
  weekendDays: z.string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      return val.split(",").map((d) => parseInt(d, 10)).filter((d) => d >= 0 && d <= 6);
    }),
});

export const createDepartmentSchema = z.object({
  name: z.string().min(1),
  isBookable: z.coerce.boolean().default(true),
  kind: z.enum(["MEDICAL", "NURSE", "LAB"]).default("MEDICAL"),
});

const workingHoursSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string(),
  endTime: z.string(),
  slotDurationMinutes: z.number().optional(),
});

// Data-URL photo, capped well above what PhotoUploadField's 256px/q0.85 JPEG
// produces (tens of KB) — the cap only exists to reject a client that bypassed
// the browser resize, not a limit anyone should normally hit.
const photoUrlSchema = z.string().max(2_000_000).optional();

export const createDoctorSchema = z.object({
  departmentId: z.string(),
  name: z.string().min(1),
  // 0 is valid — nurse/lab staff records don't take a consultation fee.
  consultationFee: z.number().min(0).default(0),
  qualifications: z.string().max(500).optional(),
  bio: z.string().max(1000).optional(),
  specialization: z.string().max(200).optional(),
  licenseNumber: z.string().max(100).optional(),
  yearsOfExperience: z.number().int().min(0).max(60).optional(),
  photoUrl: photoUrlSchema,
  workingHours: z.array(workingHoursSchema).default([]),
});

// Which department kind a login's linked Doctor (staff) row must belong to
// for each role — catches a mismatched pick (e.g. a DOCTOR login linked to
// a Nurse-department staff row) at invite/edit time instead of silently
// breaking stage-queue matching later with no visible error.
const STAFF_ROLE_TO_DEPARTMENT_KIND = {
  DOCTOR: "MEDICAL",
  NURSE: "NURSE",
  LAB: "LAB",
} as const;

const STAFF_ROLES_REQUIRING_DOCTOR = Object.keys(STAFF_ROLE_TO_DEPARTMENT_KIND) as Array<
  keyof typeof STAFF_ROLE_TO_DEPARTMENT_KIND
>;

async function assertDoctorMatchesRole(doctorId: string, role: keyof typeof STAFF_ROLE_TO_DEPARTMENT_KIND) {
  const doctor = await prisma.doctor.findUnique({ where: { id: doctorId }, include: { department: true } });
  if (!doctor) throw new Error("Staff record not found");
  const expectedKind = STAFF_ROLE_TO_DEPARTMENT_KIND[role];
  if (doctor.department.kind !== expectedKind) {
    throw new Error(`That staff record's department isn't a ${expectedKind === "MEDICAL" ? "medical" : expectedKind.toLowerCase()} department`);
  }
}

export const inviteStaffSchema = z.object({
  email: z.string().email(),
  role: z.enum(["RECEPTIONIST", "DOCTOR", "NURSE", "LAB"]),
  doctorId: z.string().optional(),
  photoUrl: photoUrlSchema,
});

export async function getClinic(clinicId: string) {
  return prisma.clinic.findUniqueOrThrow({ where: { id: clinicId } });
}

export async function updateClinic(clinicId: string, input: z.infer<typeof updateClinicSchema>) {
  return prisma.clinic.update({ where: { id: clinicId }, data: input });
}

export const updateWhatsAppCredentialsSchema = z.object({
  phoneNumberId: z.string().optional(),
  accessToken: z.string().optional(),
  appSecret: z.string().optional(),
});

/**
 * Access Token / App Secret are masked in the admin UI once set — the real
 * values are never sent back to the browser, so a blank submission means
 * "leave it as-is," not "clear it." Only a non-empty value replaces what's
 * stored. Phone Number ID follows the same rule for consistency, even
 * though it isn't itself a secret.
 */
export async function updateWhatsAppCredentials(
  clinicId: string,
  input: z.infer<typeof updateWhatsAppCredentialsSchema>,
) {
  return prisma.clinic.update({
    where: { id: clinicId },
    data: {
      whatsappPhoneNumberId: input.phoneNumberId || undefined,
      whatsappAccessToken: input.accessToken || undefined,
      whatsappAppSecret: input.appSecret || undefined,
    },
  });
}

/** Generates and saves a verify token the first time a clinic needs one — the admin pastes this into Meta's webhook config. */
export async function ensureWhatsAppVerifyToken(clinicId: string): Promise<string> {
  const clinic = await prisma.clinic.findUniqueOrThrow({ where: { id: clinicId } });
  if (clinic.whatsappVerifyToken) return clinic.whatsappVerifyToken;

  const token = crypto.randomBytes(16).toString("hex");
  await prisma.clinic.update({ where: { id: clinicId }, data: { whatsappVerifyToken: token } });
  return token;
}

export async function listDepartments(clinicId: string) {
  return prisma.department.findMany({ where: { clinicId }, orderBy: { name: "asc" } });
}

export async function createDepartment(clinicId: string, input: z.infer<typeof createDepartmentSchema>) {
  return prisma.department.create({
    data: { clinicId, name: input.name, isBookable: input.isBookable, kind: input.kind },
  });
}

export const updateDepartmentSchema = z.object({
  name: z.string().min(1),
  isBookable: z.coerce.boolean(),
  kind: z.enum(["MEDICAL", "NURSE", "LAB"]),
});

export async function updateDepartment(
  clinicId: string,
  departmentId: string,
  input: z.infer<typeof updateDepartmentSchema>,
) {
  const department = await prisma.department.findFirst({ where: { id: departmentId, clinicId } });
  if (!department) throw new Error("Department not found");

  return prisma.department.update({
    where: { id: departmentId },
    data: { name: input.name, isBookable: input.isBookable, kind: input.kind },
  });
}

/**
 * Blocked while any doctor is still assigned (Doctor.departmentId is
 * required, so deleting would either orphan them or fail the FK) or while
 * the department is used in any configured Flow (as the owner or as a
 * stage) — clear those first from Doctors/Flow.
 */
export async function deleteDepartment(clinicId: string, departmentId: string) {
  const department = await prisma.department.findFirst({ where: { id: departmentId, clinicId } });
  if (!department) throw new Error("Department not found");

  const doctorCount = await prisma.doctor.count({ where: { departmentId } });
  if (doctorCount > 0) {
    throw new Error("This department has doctors assigned — move or remove them first.");
  }

  const flowStepCount = await prisma.flowStep.count({
    where: { clinicId, OR: [{ ownerDepartmentId: departmentId }, { stageDepartmentId: departmentId }] },
  });
  if (flowStepCount > 0) {
    throw new Error("This department is used in a configured flow — remove it from the Flow tab first.");
  }

  await prisma.department.delete({ where: { id: departmentId } });
}

export async function listFlowSteps(clinicId: string, ownerDepartmentId: string) {
  return prisma.flowStep.findMany({
    where: { clinicId, ownerDepartmentId },
    include: { stageDepartment: true },
    orderBy: { order: "asc" },
  });
}

/**
 * Replaces a department's entire flow sequence in one transaction — simpler
 * and less error-prone than diffing individual reorder/insert/remove ops
 * against what's already stored.
 */
export async function saveFlowSteps(clinicId: string, ownerDepartmentId: string, stageDepartmentIds: string[]) {
  if (stageDepartmentIds.includes(ownerDepartmentId)) {
    throw new Error("A department cannot be its own flow stage");
  }
  return prisma.$transaction([
    prisma.flowStep.deleteMany({ where: { clinicId, ownerDepartmentId } }),
    prisma.flowStep.createMany({
      data: stageDepartmentIds.map((stageDepartmentId, order) => ({
        clinicId,
        ownerDepartmentId,
        stageDepartmentId,
        order,
      })),
    }),
  ]);
}

export async function listLabFieldDefinitions(clinicId: string, departmentId: string) {
  return prisma.labFieldDefinition.findMany({
    where: { clinicId, departmentId },
    orderBy: { order: "asc" },
  });
}

export const saveLabFieldDefinitionsSchema = z.array(
  z.object({
    label: z.string().min(1),
    fieldType: z.enum(["TEXT", "NUMBER", "TEXTAREA", "ATTACHMENT"]),
    required: z.coerce.boolean().default(false),
  }),
);

/**
 * Replaces a lab department's entire field set in one transaction — same
 * replace-all pattern as saveFlowSteps. Removing a field that already has
 * recorded LabResultValue rows fails (LabResultValue.fieldDefinition has no
 * cascade) rather than silently deleting patient lab history; surface that
 * as a clear error instead of a raw FK failure.
 */
export async function saveLabFieldDefinitions(
  clinicId: string,
  departmentId: string,
  fields: z.infer<typeof saveLabFieldDefinitionsSchema>,
) {
  const department = await prisma.department.findFirst({ where: { id: departmentId, clinicId } });
  if (!department) throw new Error("Department not found");
  if (department.kind !== "LAB") throw new Error("Only Lab-kind departments can have result fields");

  try {
    return await prisma.$transaction([
      prisma.labFieldDefinition.deleteMany({ where: { clinicId, departmentId } }),
      prisma.labFieldDefinition.createMany({
        data: fields.map((f, order) => ({ clinicId, departmentId, order, ...f })),
      }),
    ]);
  } catch {
    throw new Error("Can't remove a field that already has recorded results — history would be lost.");
  }
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
      consultationFee: input.consultationFee,
      qualifications: input.qualifications,
      bio: input.bio,
      specialization: input.specialization,
      licenseNumber: input.licenseNumber,
      yearsOfExperience: input.yearsOfExperience,
      photoUrl: input.photoUrl || null,
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

export const updateDoctorSchema = createDoctorSchema.extend({
  departmentId: z.string().optional(),
  name: z.string().min(1).optional(),
}).partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided" }
);

/**
 * Replaces the doctor's name/department/weekly hours/professional details.
 * Existing booked slots are left alone (only OPEN — i.e. not-yet-booked —
 * future slots are cleared and regenerated from the new hours), so changing
 * a schedule can never silently cancel a patient's confirmed appointment.
 */
export async function updateDoctor(
  clinicId: string,
  doctorId: string,
  input: z.infer<typeof updateDoctorSchema>,
) {
  const doctor = await prisma.doctor.findFirst({ where: { id: doctorId, clinicId } });
  if (!doctor) throw new Error("Doctor not found");

  const updateData: any = {};
  if (input.name) updateData.name = input.name;
  if (input.departmentId) updateData.departmentId = input.departmentId;
  if (input.consultationFee !== undefined) updateData.consultationFee = input.consultationFee;
  if (input.qualifications !== undefined) updateData.qualifications = input.qualifications;
  if (input.bio !== undefined) updateData.bio = input.bio;
  if (input.specialization !== undefined) updateData.specialization = input.specialization;
  if (input.licenseNumber !== undefined) updateData.licenseNumber = input.licenseNumber;
  if (input.yearsOfExperience !== undefined) updateData.yearsOfExperience = input.yearsOfExperience;
  if (input.photoUrl !== undefined) updateData.photoUrl = input.photoUrl || null;

  const transactions: any[] = [
    prisma.doctor.update({
      where: { id: doctorId },
      data: updateData,
    }),
  ];

  // Only regenerate slots if working hours are provided
  if (input.workingHours && input.workingHours.length > 0) {
    transactions.push(
      prisma.workingHours.deleteMany({ where: { doctorId } }),
      prisma.workingHours.createMany({
        data: input.workingHours.map((wh) => ({
          doctorId,
          dayOfWeek: wh.dayOfWeek,
          startTime: wh.startTime,
          endTime: wh.endTime,
          slotDurationMinutes: wh.slotDurationMinutes ?? 20,
        })),
      }),
      prisma.slot.deleteMany({ where: { doctorId, status: "OPEN" } }),
    );
  }

  await prisma.$transaction(transactions);

  // Only regenerate slots if working hours were updated
  if (input.workingHours && input.workingHours.length > 0) {
    await generateSlotsForDoctor(doctorId);
  }
}

/**
 * Only allowed when the doctor has no appointment history at all — otherwise
 * this would orphan real appointment/consultation records. Deactivate
 * instead for a doctor who's simply left the clinic.
 */
export async function deleteDoctor(clinicId: string, doctorId: string) {
  const doctor = await prisma.doctor.findFirst({ where: { id: doctorId, clinicId } });
  if (!doctor) throw new Error("Doctor not found");

  const appointmentCount = await prisma.appointment.count({ where: { doctorId } });
  if (appointmentCount > 0) {
    throw new Error("This doctor has appointment history and can't be deleted — deactivate them instead.");
  }

  await prisma.$transaction([
    prisma.user.deleteMany({ where: { doctorId } }),
    prisma.slot.deleteMany({ where: { doctorId } }),
    prisma.workingHours.deleteMany({ where: { doctorId } }),
    prisma.doctor.delete({ where: { id: doctorId } }),
  ]);
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

function requiresDoctorRecord(role: string): role is keyof typeof STAFF_ROLE_TO_DEPARTMENT_KIND {
  return (STAFF_ROLES_REQUIRING_DOCTOR as string[]).includes(role);
}

export async function inviteStaff(clinicId: string, input: z.infer<typeof inviteStaffSchema>) {
  if (requiresDoctorRecord(input.role)) {
    if (!input.doctorId) throw new Error("This login must be linked to a staff record");
    await assertDoctorMatchesRole(input.doctorId, input.role);
  }
  return prisma.user.create({
    data: {
      clinicId,
      email: input.email.trim().toLowerCase(),
      role: input.role,
      doctorId: requiresDoctorRecord(input.role) ? input.doctorId : undefined,
      photoUrl: input.photoUrl || null,
    },
  });
}

export const updateStaffSchema = z.object({
  role: z.enum(["RECEPTIONIST", "DOCTOR", "NURSE", "LAB"]),
  doctorId: z.string().optional(),
  photoUrl: photoUrlSchema,
});

export async function updateStaff(clinicId: string, userId: string, input: z.infer<typeof updateStaffSchema>) {
  const user = await prisma.user.findFirst({ where: { id: userId, clinicId } });
  if (!user) throw new Error("Staff member not found");
  if (user.role === "CLINIC_ADMIN") throw new Error("Can't change the clinic admin's role here");
  if (requiresDoctorRecord(input.role)) {
    if (!input.doctorId) throw new Error("Pick which staff record this login represents");
    await assertDoctorMatchesRole(input.doctorId, input.role);
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      role: input.role,
      doctorId: requiresDoctorRecord(input.role) ? input.doctorId : null,
      ...(input.photoUrl !== undefined ? { photoUrl: input.photoUrl || null } : {}),
    },
  });
}

/** Revokes a staff member's access. A clinic admin can't remove their own account this way. */
export async function removeStaff(clinicId: string, userId: string, requestingUserId: string) {
  if (userId === requestingUserId) throw new Error("You can't remove your own account.");
  const user = await prisma.user.findFirst({ where: { id: userId, clinicId } });
  if (!user) throw new Error("Staff member not found");
  if (user.role === "CLINIC_ADMIN") throw new Error("Can't remove the clinic admin account.");

  await prisma.user.delete({ where: { id: userId } });
}
