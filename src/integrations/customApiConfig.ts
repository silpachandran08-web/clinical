import { z } from "zod";

/**
 * Runtime-validated shape of `Clinic.integrationConfig` when
 * `integrationMode = CUSTOM_API` — a clinic that already runs its own
 * booking system and only wants the WhatsApp AI to talk to it over HTTP.
 * The admin fills all of this in from the dashboard (see
 * IntegrationSettingsForm.tsx); nothing here requires a code change per
 * clinic.
 */
export const authConfigSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("NONE") }),
  z.object({
    type: z.literal("API_KEY"),
    headerName: z.string().trim().min(1).max(100),
    apiKey: z.string().trim().min(1).max(500),
  }),
  z.object({
    type: z.literal("BEARER"),
    token: z.string().trim().min(1).max(500),
  }),
  z.object({
    type: z.literal("BASIC"),
    username: z.string().trim().min(1).max(200),
    password: z.string().trim().min(1).max(500),
  }),
]);

export type AuthConfig = z.infer<typeof authConfigSchema>;

export const endpointConfigSchema = z.object({
  method: z.enum(["GET", "POST"]),
  path: z.string().trim().min(1).max(500),
  // Dot-path to the array within the response, for endpoints that return a
  // list (e.g. "data.doctors") — omit if the response body is the array
  // itself. Ignored for single-object endpoints (bookSlot, cancelAppointment).
  listPath: z.string().trim().min(1).optional(),
  // key = our field name (e.g. "doctorId"), value = dot-path into their
  // JSON response (e.g. "data.doctor.id") — see getByPath below.
  responseMapping: z.record(z.string().trim().min(1)),
});

export type EndpointConfig = z.infer<typeof endpointConfigSchema>;

export const customApiConfigSchema = z.object({
  baseUrl: z.string().trim().url().max(500),
  auth: authConfigSchema,
  endpoints: z.object({
    listDoctors: endpointConfigSchema,
    checkAvailability: endpointConfigSchema,
    bookSlot: endpointConfigSchema,
    cancelAppointment: endpointConfigSchema,
    getPatientAppointments: endpointConfigSchema,
  }),
});

export type CustomApiConfig = z.infer<typeof customApiConfigSchema>;

export const CUSTOM_API_CAPABILITIES = [
  "listDoctors",
  "checkAvailability",
  "bookSlot",
  "cancelAppointment",
  "getPatientAppointments",
] as const satisfies readonly (keyof CustomApiConfig["endpoints"])[];

/**
 * Resolves a dot-path (e.g. "data.doctor.id") against an arbitrary JSON
 * value. Returns undefined if any segment is missing — callers decide
 * whether that's an error or an acceptable gap (e.g. optional fields).
 */
export function getByPath(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (current == null || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[segment];
  }, value);
}
