import type { Clinic } from "@prisma/client";
import { FhirAdapter } from "./fhirAdapter";
import { NativeAdapter } from "./nativeAdapter";
import type { EhrAdapter } from "./ehrAdapter";

const nativeAdapter = new NativeAdapter();

/** Resolves the right adapter per clinic — this is the whole "plug into any system" story in one function. */
export function getEhrAdapter(clinic: Clinic): EhrAdapter {
  switch (clinic.integrationMode) {
    case "FHIR": {
      const config = clinic.integrationConfig as { baseUrl: string; authToken: string } | null;
      if (!config) throw new Error(`Clinic ${clinic.id} is set to FHIR mode but has no integrationConfig`);
      return new FhirAdapter(config);
    }
    case "SHEETS":
      throw new Error("SheetsAdapter not yet implemented");
    case "NATIVE":
    default:
      return nativeAdapter;
  }
}

export type { EhrAdapter, AvailabilitySlot, BookingResult } from "./ehrAdapter";
