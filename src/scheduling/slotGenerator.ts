import { prisma } from "../db/client";

export interface WorkingHoursTemplate {
  dayOfWeek: number; // 0=Sun..6=Sat
  startTime: string; // "09:00"
  endTime: string; // "17:00"
  slotDurationMinutes: number;
}

export interface GeneratedSlot {
  startsAt: Date;
  endsAt: Date;
}

/**
 * Pure function: expands a doctor's recurring weekly template into concrete
 * slot start/end times over [from, to). Kept free of DB/IO so it's cheap to
 * unit test (see tests/slotGenerator.test.ts) — the only side-effecting part
 * is the thin wrapper below that persists the result.
 */
export function generateSlotTimes(
  templates: WorkingHoursTemplate[],
  from: Date,
  to: Date,
): GeneratedSlot[] {
  const slots: GeneratedSlot[] = [];

  for (const day = new Date(from); day < to; day.setDate(day.getDate() + 1)) {
    const templatesForDay = templates.filter((t) => t.dayOfWeek === day.getDay());

    for (const template of templatesForDay) {
      const [startH, startM] = template.startTime.split(":").map(Number);
      const [endH, endM] = template.endTime.split(":").map(Number);

      let cursor = new Date(day);
      cursor.setHours(startH, startM, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(endH, endM, 0, 0);

      while (cursor < dayEnd) {
        const startsAt = new Date(cursor);
        const endsAt = new Date(cursor.getTime() + template.slotDurationMinutes * 60_000);
        if (endsAt > dayEnd) break;
        slots.push({ startsAt, endsAt });
        cursor = endsAt;
      }
    }
  }

  return slots;
}

/** Materializes upcoming slots for one doctor into the DB, skipping ones that already exist. */
export async function generateSlotsForDoctor(doctorId: string, windowDays = 30): Promise<number> {
  const templates = await prisma.workingHours.findMany({ where: { doctorId } });
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + windowDays);

  const slotTimes = generateSlotTimes(templates, from, to);

  const result = await prisma.slot.createMany({
    data: slotTimes.map((s) => ({ doctorId, startsAt: s.startsAt, endsAt: s.endsAt })),
    skipDuplicates: true,
  });

  return result.count;
}
