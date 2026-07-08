import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listClinicAppointments } from "../../../src/adminHandlers.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const { clinicId } = req.query as { clinicId: string };
  const appointments = await listClinicAppointments(clinicId);
  res.status(200).json(appointments);
}
