import { describe, expect, it } from "vitest";
import { generateSlotTimes } from "../src/scheduling/slotGenerator.js";

describe("generateSlotTimes", () => {
  it("generates evenly spaced slots within working hours for matching days only", () => {
    // Sunday=0 works 09:00-10:00 in 20 min slots -> 3 slots. No template for other days.
    const from = new Date("2026-08-02T00:00:00"); // a Sunday
    const to = new Date("2026-08-04T00:00:00"); // Tue, 2-day window

    const slots = generateSlotTimes(
      [{ dayOfWeek: 0, startTime: "09:00", endTime: "10:00", slotDurationMinutes: 20 }],
      from,
      to,
    );

    expect(slots).toHaveLength(3);
    expect(slots[0].startsAt.getHours()).toBe(9);
    expect(slots[0].startsAt.getMinutes()).toBe(0);
    expect(slots[2].startsAt.getMinutes()).toBe(40);
    expect(slots[2].endsAt.getHours()).toBe(10);
  });

  it("never emits a slot that would run past the working-hours end time", () => {
    // 25-minute slots into a 60-minute window -> only 2 fit (0-25, 25-50), not a 3rd (50-75).
    const from = new Date("2026-08-02T00:00:00");
    const to = new Date("2026-08-03T00:00:00");

    const slots = generateSlotTimes(
      [{ dayOfWeek: 0, startTime: "09:00", endTime: "10:00", slotDurationMinutes: 25 }],
      from,
      to,
    );

    expect(slots).toHaveLength(2);
    for (const slot of slots) {
      expect(slot.endsAt.getTime()).toBeLessThanOrEqual(new Date("2026-08-02T10:00:00").getTime());
    }
  });

  it("produces no slots for days without a matching template (e.g. the Fri/Sat weekend)", () => {
    // Only Sunday has a template; asking across Thu-Sat should yield nothing.
    const from = new Date("2026-08-06T00:00:00"); // Thu
    const to = new Date("2026-08-09T00:00:00"); // through Sat

    const slots = generateSlotTimes(
      [{ dayOfWeek: 0, startTime: "09:00", endTime: "10:00", slotDurationMinutes: 20 }],
      from,
      to,
    );

    expect(slots).toHaveLength(0);
  });
});
