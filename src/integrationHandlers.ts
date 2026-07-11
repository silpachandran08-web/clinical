import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "./db/client";
import { CustomApiAdapter } from "./integrations/customApiAdapter";
import { customApiConfigSchema, endpointConfigSchema, type AuthConfig, type CustomApiConfig } from "./integrations/customApiConfig";

export const updateIntegrationModeSchema = z.object({
  integrationMode: z.enum(["NATIVE", "CUSTOM_API"]),
});

/**
 * Admin-only: switches a clinic between "we host your data" (NATIVE) and
 * "WhatsApp AI only, talk to our own system" (CUSTOM_API). FHIR/SHEETS have
 * no admin UI yet — only reachable by direct DB edit for a pilot clinic.
 */
export async function updateIntegrationMode(clinicId: string, mode: "NATIVE" | "CUSTOM_API") {
  return prisma.clinic.update({ where: { id: clinicId }, data: { integrationMode: mode } });
}

// Same shape as authConfigSchema, except the secret field is optional — an
// empty submission means "keep the currently saved secret", mirroring the
// POS/WhatsApp credential masking convention.
const authFormSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("NONE") }),
  z.object({
    type: z.literal("API_KEY"),
    headerName: z.string().trim().min(1).max(100),
    apiKey: z.string().trim().max(500).optional(),
  }),
  z.object({ type: z.literal("BEARER"), token: z.string().trim().max(500).optional() }),
  z.object({
    type: z.literal("BASIC"),
    username: z.string().trim().min(1).max(200),
    password: z.string().trim().max(500).optional(),
  }),
]);

export const integrationConfigFormSchema = z.object({
  baseUrl: z.string().trim().url().max(500),
  auth: authFormSchema,
  endpoints: z.object({
    listDoctors: endpointConfigSchema,
    checkAvailability: endpointConfigSchema,
    bookSlot: endpointConfigSchema,
    cancelAppointment: endpointConfigSchema,
    getPatientAppointments: endpointConfigSchema,
  }),
});

export type IntegrationConfigFormInput = z.infer<typeof integrationConfigFormSchema>;

/**
 * Merges a submitted form (where secret fields may be blank, meaning "keep
 * existing") against the clinic's currently saved config, producing a fully
 * resolved CustomApiConfig. Shared by the save action and the test-connection
 * action so "test before saving" behaves the same as what would be saved.
 */
async function resolveCustomApiConfig(clinicId: string, input: IntegrationConfigFormInput): Promise<CustomApiConfig> {
  const clinic = await prisma.clinic.findUniqueOrThrow({ where: { id: clinicId } });
  const existing = customApiConfigSchema.safeParse(clinic.integrationConfig);
  const existingAuth = existing.success ? existing.data.auth : null;

  let auth: AuthConfig;
  switch (input.auth.type) {
    case "NONE":
      auth = { type: "NONE" };
      break;
    case "API_KEY": {
      const apiKey = input.auth.apiKey || (existingAuth?.type === "API_KEY" ? existingAuth.apiKey : "");
      if (!apiKey) throw new Error("API key is required.");
      auth = { type: "API_KEY", headerName: input.auth.headerName, apiKey };
      break;
    }
    case "BEARER": {
      const token = input.auth.token || (existingAuth?.type === "BEARER" ? existingAuth.token : "");
      if (!token) throw new Error("Bearer token is required.");
      auth = { type: "BEARER", token };
      break;
    }
    case "BASIC": {
      const password = input.auth.password || (existingAuth?.type === "BASIC" ? existingAuth.password : "");
      if (!password) throw new Error("Password is required.");
      auth = { type: "BASIC", username: input.auth.username, password };
      break;
    }
  }

  return customApiConfigSchema.parse({ baseUrl: input.baseUrl, auth, endpoints: input.endpoints });
}

export async function updateIntegrationConfig(clinicId: string, input: IntegrationConfigFormInput) {
  const config = await resolveCustomApiConfig(clinicId, input);
  return prisma.clinic.update({
    where: { id: clinicId },
    data: { integrationConfig: config as unknown as Prisma.InputJsonValue },
  });
}

/** Test-connection: resolves the (unsaved-safe) config and calls List Doctors live, returning both the raw and mapped response for the admin to sanity-check field mappings before saving. */
export async function testCustomApiListDoctors(clinicId: string, input: IntegrationConfigFormInput) {
  const config = await resolveCustomApiConfig(clinicId, input);
  const adapter = new CustomApiAdapter(config);
  return adapter.testCapability("listDoctors", {});
}
