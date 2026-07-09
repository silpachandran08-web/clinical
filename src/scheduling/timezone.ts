/**
 * Dependency-free IANA-timezone-aware date helpers. `Date.prototype.setHours`
 * and friends always operate in the server process's local timezone — fine
 * on a laptop set to Asia/Riyadh, silently wrong on Vercel (which runs in
 * UTC) for a clinic whose working hours are meant as Riyadh wall-clock time.
 * Every function here is anchored to an explicit `timeZone` instead of
 * relying on the runtime's own local timezone.
 */

/** The absolute UTC instant corresponding to the given wall-clock date/time as observed in `timeZone`. */
export function zonedTimeToUtc(
  year: number,
  month: number, // 1-12
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  // Standard round-trip trick: treat the components as if they were UTC,
  // see what wall-clock time that instant actually displays as in the
  // target zone, then correct by the difference. Works for any IANA zone,
  // DST included, without a date library.
  const naiveUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const partsInZone = getPartsInTimezone(naiveUtc, timeZone);
  const asIfLocal = Date.UTC(
    partsInZone.year,
    partsInZone.month - 1,
    partsInZone.day,
    partsInZone.hour,
    partsInZone.minute,
    partsInZone.second,
  );
  const driftMs = naiveUtc.getTime() - asIfLocal;
  return new Date(naiveUtc.getTime() + driftMs);
}

/** Midnight of `reference`'s calendar date, as observed in `timeZone`. */
export function startOfDayInTimezone(reference: Date, timeZone: string): Date {
  const { year, month, day } = getDatePartsInTimezone(reference, timeZone);
  return zonedTimeToUtc(year, month, day, 0, 0, timeZone);
}

/** Calendar year/month/day of `date` as observed in `timeZone` (e.g. for walking days without server-local Date getters). */
export function getDatePartsInTimezone(
  date: Date,
  timeZone: string,
): { year: number; month: number; day: number } {
  const { year, month, day } = getPartsInTimezone(date, timeZone);
  return { year, month, day };
}

function getPartsInTimezone(
  date: Date,
  timeZone: string,
): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date).reduce<Record<string, string>>((acc, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {});
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    // Intl can format midnight as "24" with hour12: false in some environments — normalize.
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}
