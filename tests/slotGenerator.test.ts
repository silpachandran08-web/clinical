import { describe, expect, it } from "vitest";
import { generateSlotTimes } from "../src/scheduling/slotGenerator.js";

describe("generateSlotTimes", () => {
  it("generates evenly spaced slots within working hours for matching days only, correct in the clinic's timezone regardless of the server's own timezone", () => {
    // Sunday=0 works 09:00-10:00 Riyadh time in 20 min slots -> 3 slots. No template for other days.
    const from = new Date("2026-08-02T00:00:00Z"); // a Sunday UTC-wise
    const to = new Date("2026-08-04T00:00:00Z"); // Tue, 2-day window

    const slots = generateSlotTimes(
      [{ dayOfWeek: 0, startTime: "09:00", endTime: "10:00", slotDurationMinutes: 20 }],
      from,
      to,
      "Asia/Riyadh",
    );

    expect(slots).toHaveLength(3);
    // 09:00 Riyadh (UTC+3, no DST) is 06:00 UTC — this is exactly the bug
    // this fix closes: naive Date.setHours() would store 09:00 UTC instead.
    expect(slots[0].startsAt.toISOString()).toBe("2026-08-02T06:00:00.000Z");
    expect(slots[1].startsAt.toISOString()).toBe("2026-08-02T06:20:00.000Z");
    expect(slots[2].startsAt.toISOString()).toBe("2026-08-02T06:40:00.000Z");
    expect(slots[2].endsAt.toISOString()).toBe("2026-08-02T07:00:00.000Z");
  });

  it("never emits a slot that would run past the working-hours end time", () => {
    // 25-minute slots into a 60-minute window -> only 2 fit (0-25, 25-50), not a 3rd (50-75).
    const from = new Date("2026-08-02T00:00:00Z");
    const to = new Date("2026-08-03T00:00:00Z");

    const slots = generateSlotTimes(
      [{ dayOfWeek: 0, startTime: "09:00", endTime: "10:00", slotDurationMinutes: 25 }],
      from,
      to,
      "Asia/Riyadh",
    );

    expect(slots).toHaveLength(2);
    const dayEndUtc = new Date("2026-08-02T07:00:00.000Z"); // 10:00 Riyadh
    for (const slot of slots) {
      expect(slot.endsAt.getTime()).toBeLessThanOrEqual(dayEndUtc.getTime());
    }
  });

  it("produces no slots for days without a matching template (e.g. the Fri/Sat weekend)", () => {
    // Only Sunday has a template; asking across Thu-Sat should yield nothing.
    // `to` is Riyadh midnight of Aug 9 (= 21:00 UTC Aug 8), not naive UTC
    // midnight — otherwise this boundary would itself reintroduce the exact
    // "server timezone, not clinic timezone" bug this fix closes.
    const from = new Date("2026-08-06T00:00:00Z"); // Thu, still Aug 6 in Riyadh too (03:00 local)
    const to = new Date("2026-08-08T21:00:00Z"); // through Sat, exclusive of Sunday

    const slots = generateSlotTimes(
      [{ dayOfWeek: 0, startTime: "09:00", endTime: "10:00", slotDurationMinutes: 20 }],
      from,
      to,
      "Asia/Riyadh",
    );

    expect(slots).toHaveLength(0);
  });

  it("produces the same wall-clock slot times for a different clinic timezone", () => {
    // A US clinic on America/New_York (UTC-4 in August, DST) — 09:00 local should be 13:00 UTC.
    const from = new Date("2026-08-02T00:00:00Z");
    const to = new Date("2026-08-03T00:00:00Z");

    const slots = generateSlotTimes(
      [{ dayOfWeek: 0, startTime: "09:00", endTime: "09:20", slotDurationMinutes: 20 }],
      from,
      to,
      "America/New_York",
    );

    expect(slots).toHaveLength(1);
    expect(slots[0].startsAt.toISOString()).toBe("2026-08-02T13:00:00.000Z");
  });
});
