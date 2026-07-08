export interface AvailabilitySlot {
  slotId: string;
  doctorId: string;
  doctorName: string;
  startsAt: Date;
  endsAt: Date;
}

export interface BookingResult {
  appointmentId: string;
  doctorName: string;
  startsAt: Date;
}

/**
 * The "plug into any clinical solution" seam. A clinic that already runs
 * its own EHR/scheduling system doesn't migrate data into us — it just
 * gets an adapter that speaks its API. Our booking core, the AI tools, and
 * the conversation orchestrator only ever call this interface, never a
 * concrete system.
 *
 * - NativeAdapter: our own Postgres is the source of truth (MVP default).
 * - FhirAdapter: for clinics on a FHIR-based system (relevant in Saudi
 *   since NPHIES, the national health exchange, is FHIR-based — a clinic
 *   already wired into NPHIES can reuse most of that integration here).
 * - SheetsAdapter: for a clinic with no software at all, backed by a
 *   Google Sheet as the schedule of record.
 */
export interface EhrAdapter {
  getAvailability(params: {
    clinicId: string;
    doctorId?: string;
    specialty?: string;
    from: Date;
    to: Date;
  }): Promise<AvailabilitySlot[]>;

  bookSlot(params: {
    clinicId: string;
    slotId: string;
    patientPhone: string;
    patientName: string;
  }): Promise<BookingResult>;

  cancelAppointment(params: { clinicId: string; appointmentId: string }): Promise<void>;
}
