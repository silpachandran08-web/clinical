import type { AvailabilitySlot, BookingResult, EhrAdapter } from "./ehrAdapter.js";

/**
 * Stub for clinics that already run a FHIR-based scheduling/EHR system.
 * Relevant in Saudi specifically because NPHIES (the national health
 * information exchange run by CCHI) is FHIR R4-based — a clinic already
 * integrated with NPHIES for insurance claims can extend that same FHIR
 * client here instead of standing up a parallel integration.
 *
 * Not wired for the MVP (single clinic runs on NativeAdapter). Fill in
 * `baseUrl`/`auth` from `clinic.integrationConfig` once a pilot clinic
 * needs it, translating Slot <-> FHIR `Schedule`/`Slot`/`Appointment`
 * resources.
 */
export class FhirAdapter implements EhrAdapter {
  constructor(private readonly config: { baseUrl: string; authToken: string }) {}

  async getAvailability(): Promise<AvailabilitySlot[]> {
    throw new Error("FhirAdapter.getAvailability not implemented — wire up when onboarding a FHIR-based clinic");
  }

  async bookSlot(): Promise<BookingResult> {
    throw new Error("FhirAdapter.bookSlot not implemented — wire up when onboarding a FHIR-based clinic");
  }

  async cancelAppointment(): Promise<void> {
    throw new Error("FhirAdapter.cancelAppointment not implemented — wire up when onboarding a FHIR-based clinic");
  }
}
