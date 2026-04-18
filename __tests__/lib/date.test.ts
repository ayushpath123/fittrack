import { describe, expect, it } from "vitest";
import { endOfDay, startOfDay, toLocalDateKey } from "../../lib/date";

describe("date helpers", () => {
  it("uses local calendar day for date keys around UTC midnight", () => {
    const utcNearMidnight = new Date("2026-04-18T23:59:59.999Z");
    const localKey = toLocalDateKey(utcNearMidnight);
    const expected = `${utcNearMidnight.getFullYear()}-${String(utcNearMidnight.getMonth() + 1).padStart(2, "0")}-${String(
      utcNearMidnight.getDate(),
    ).padStart(2, "0")}`;
    expect(localKey).toBe(expected);
  });

  it("normalizes start and end of day boundaries", () => {
    const sample = new Date("2026-04-18T13:24:56.123Z");
    const start = startOfDay(sample);
    const end = endOfDay(sample);

    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
    expect(start.getMilliseconds()).toBe(0);

    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
    expect(end.getSeconds()).toBe(59);
    expect(end.getMilliseconds()).toBe(999);
  });
});
