import * as bookingService from "../scheduling/bookingService.js";
import type { AvailabilitySlot, BookingResult, EhrAdapter } from "./ehrAdapter.js";

/** Default adapter: our own Postgres booking core is the source of truth. */
export class NativeAdapter implements EhrAdapter {
  async getAvailability(params: {
    clinicId: string;
    doctorId?: string;
    specialty?: string;
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

  async cancelAppointment(params: { clinicId: string; appointmentId: string }): Promise<void> {
    await bookingService.cancelAppointment(params.clinicId, params.appointmentId);
  }
}
