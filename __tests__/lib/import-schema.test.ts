import { describe, expect, it } from "vitest";
import { importRequestSchema } from "@/lib/validators";

describe("importRequestSchema", () => {
  it("accepts a v1 backup with optional hydrationLogs", () => {
    const parsed = importRequestSchema.safeParse({
      mode: "merge",
      backup: {
        version: 1,
        exportedAt: "2026-01-01T00:00:00.000Z",
        meals: [],
        workouts: [],
        weightLogs: [],
      },
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid mode", () => {
    const parsed = importRequestSchema.safeParse({
      mode: "wipe",
      backup: { version: 1, meals: [], workouts: [], weightLogs: [] },
    });
    expect(parsed.success).toBe(false);
  });
});
