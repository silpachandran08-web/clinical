import { prisma } from "../db/client";
import * as bookingService from "../scheduling/bookingService";
import type {
  AvailabilitySlot,
  BookingResult,
  DoctorSummary,
  EhrAdapter,
  PatientAppointmentSummary,
} from "./ehrAdapter";

/** Default adapter: our own Postgres booking core is the source of truth. */
export class NativeAdapter implements EhrAdapter {
  async listDoctors(params: { clinicId: string; departmentName?: string }): Promise<DoctorSummary[]> {
    const doctors = await prisma.doctor.findMany({
      where: {
        clinicId: params.clinicId,
        active: true,
        ...(params.departmentName ? { department: { name: params.departmentName } } : {}),
      },
      select: { id: true, name: true, department: { select: { name: true } } },
    });
    return doctors.map((d) => ({
      doctorId: d.id,
      doctorName: d.name,
      departmentName: d.department?.name ?? null,
    }));
  }

  async getAvailability(params: {
    clinicId: string;
    doctorId?: string;
    departmentName?: string;
    from: Date;
    to: Date;
  }): Promise<AvailabilitySlot[]> {
    const slots = await bookingService.getAvailability(params);
    return slots.map((s) => ({
      slotId: s.id,
      doctorId: s.doctorId,
      doctorName: s.doctor.name,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
    }));
  }

  async bookSlot(params: {
    clinicId: string;
    slotId: string;
    patientPhone: string;
    patientName: string;
  }): Promise<BookingResult> {
    const result = await bookingService.bookSlot(params);
    return result;
  }

  async getPatientAppointments(params: {
    clinicId: string;
    patientPhone: string;
  }): Promise<PatientAppointmentSummary[]> {
    const appointments = await bookingService.getPatientAppointments(params.clinicId, params.patientPhone);
    return appointments.map((a) => ({
      appointmentId: a.id,
      doctorName: a.doctor.name,
      startsAt: a.slot.startsAt,
    }));
  }

  async cancelAppointment(params: { clinicId: string; appointmentId: string }): Promise<void> {
    await bookingService.cancelAppointment(params.clinicId, params.appointmentId);
  }
}
