import { prisma } from "../db/client";
import { getDatePartsInTimezone, startOfDayInTimezone, zonedTimeToUtc } from "./timezone";

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
 *
 * Walks calendar days as plain {year, month, day} components rather than
 * mutating a Date with setDate/getDay — those getters run in the server
 * process's local timezone, which is wrong the moment the clinic's
 * `timeZone` differs from wherever this code happens to execute (e.g.
 * Vercel runs in UTC regardless of which country the clinic is in).
 */
export function generateSlotTimes(
  templates: WorkingHoursTemplate[],
  from: Date,
  to: Date,
  timeZone: string,
): GeneratedSlot[] {
  const slots: GeneratedSlot[] = [];

  let { year, month, day } = getDatePartsInTimezone(from, timeZone);

  while (true) {
    const dayStart = zonedTimeToUtc(year, month, day, 0, 0, timeZone);
    if (dayStart >= to) break;

    // Calendar day-of-week is purely a function of the Y-M-D calendar date,
    // not of any timezone offset — UTC-midnight-of-that-date is fine here.
    const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    const templatesForDay = templates.filter((t) => t.dayOfWeek === dayOfWeek);

    for (const template of templatesForDay) {
      const [startH, startM] = template.startTime.split(":").map(Number);
      const [endH, endM] = template.endTime.split(":").map(Number);

      let cursor = zonedTimeToUtc(year, month, day, startH, startM, timeZone);
      const dayEnd = zonedTimeToUtc(year, month, day, endH, endM, timeZone);

      while (cursor < dayEnd) {
        const startsAt = cursor;
        const endsAt = new Date(cursor.getTime() + template.slotDurationMinutes * 60_000);
        if (endsAt > dayEnd) break;
        slots.push({ startsAt, endsAt });
        cursor = endsAt;
      }
    }

    const next = new Date(Date.UTC(year, month - 1, day + 1));
    year = next.getUTCFullYear();
    month = next.getUTCMonth() + 1;
    day = next.getUTCDate();
  }

  return slots;
}

/** Materializes upcoming slots for one doctor into the DB, skipping ones that already exist. */
export async function generateSlotsForDoctor(doctorId: string, windowDays = 30): Promise<number> {
  const doctor = await prisma.doctor.findUniqueOrThrow({
    where: { id: doctorId },
    include: { workingHours: true, clinic: true },
  });

  const from = startOfDayInTimezone(new Date(), doctor.clinic.timezone);
  const to = new Date(from.getTime() + windowDays * 24 * 60 * 60 * 1000);

  const slotTimes = generateSlotTimes(doctor.workingHours, from, to, doctor.clinic.timezone);

  const result = await prisma.slot.createMany({
    data: slotTimes.map((s) => ({ doctorId, startsAt: s.startsAt, endsAt: s.endsAt })),
    skipDuplicates: true,
  });

  return result.count;
}
