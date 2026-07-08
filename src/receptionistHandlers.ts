import { prisma } from "./db/client";
import * as bookingService from "./scheduling/bookingService";

function startOfToday(): Date {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start;
}

function startOfTomorrow(): Date {
  const start = startOfToday();
  start.setDate(start.getDate() + 1);
  return start;
}

export async function listTodayAppointments(clinicId: string) {
  return prisma.appointment.findMany({
    where: { clinicId, slot: { startsAt: { gte: startOfToday(), lt: startOfTomorrow() } } },
    include: { doctor: true, patient: true, slot: true },
    orderBy: { slot: { startsAt: "asc" } },
  });
}

/** For the "who's with a patient right now vs who's waiting" board. */
export async function listDoctorsWithTodayStatus(clinicId: string) {
  const doctors = await prisma.doctor.findMany({
    where: { clinicId, active: true },
    include: {
      appointments: {
        where: {
          slot: { startsAt: { gte: startOfToday(), lt: startOfTomorrow() } },
          status: { in: ["CHECKED_IN", "IN_PROGRESS"] },
        },
        include: { patient: true, slot: true },
        orderBy: { slot: { startsAt: "asc" } },
      },
    },
    orderBy: { name: "asc" },
  });

  return doctors.map((d) => ({
    id: d.id,
    name: d.name,
    inProgressWith: d.appointments.find((a) => a.status === "IN_PROGRESS") ?? null,
    waiting: d.appointments.filter((a) => a.status === "CHECKED_IN"),
  }));
}

export async function checkInAppointment(clinicId: string, appointmentId: string) {
  const result = await prisma.appointment.updateMany({
    where: { id: appointmentId, clinicId, status: "CONFIRMED" },
    data: { status: "CHECKED_IN", checkedInAt: new Date() },
  });
  if (result.count === 0) {
    throw new Error("Appointment not found, or not in a state that can be checked in");
  }
}

export async function listTodayAvailability(clinicId: string, doctorId: string) {
  return bookingService.getAvailability({
    clinicId,
    doctorId,
    from: new Date(),
    to: startOfTomorrow(),
  });
}

export async function bookWalkIn(params: {
  clinicId: string;
  slotId: string;
  patientPhone: string;
  patientName: string;
}) {
  return bookingService.bookSlot({ ...params, bookedByStaff: true });
}
