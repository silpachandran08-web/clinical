import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ZodError } from "zod";
import { createClinic, createClinicSchema } from "../../src/adminHandlers.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const body = createClinicSchema.parse(req.body);
    const clinic = await createClinic(body);
    res.status(201).json(clinic);
  } catch (err) {
    if (err instanceof ZodError) return res.status(400).json({ error: err.issues });
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
}
