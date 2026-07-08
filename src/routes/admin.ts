import type { FastifyInstance } from "fastify";
import {
  createClinic,
  createClinicSchema,
  createDoctor,
  createDoctorSchema,
  listClinicAppointments,
} from "../adminHandlers.js";

export async function registerAdminRoutes(app: FastifyInstance) {
  app.post("/admin/clinics", async (request, reply) => {
    const body = createClinicSchema.parse(request.body);
    const clinic = await createClinic(body);
    return reply.code(201).send(clinic);
  });

  app.post("/admin/doctors", async (request, reply) => {
    const body = createDoctorSchema.parse(request.body);
    const result = await createDoctor(body);
    return reply.code(201).send(result);
  });

  app.get("/admin/clinics/:clinicId/appointments", async (request) => {
    const { clinicId } = request.params as { clinicId: string };
    return listClinicAppointments(clinicId);
  });
}
