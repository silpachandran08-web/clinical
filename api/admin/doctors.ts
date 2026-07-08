import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ZodError } from "zod";
import { createDoctor, createDoctorSchema } from "../../src/adminHandlers.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const body = createDoctorSchema.parse(req.body);
    const result = await createDoctor(body);
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof ZodError) return res.status(400).json({ error: err.issues });
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
}
