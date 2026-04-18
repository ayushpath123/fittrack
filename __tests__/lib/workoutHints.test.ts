import { describe, expect, it } from "vitest";
import { toLocalDateKey } from "@/lib/date";
import { buildExerciseLastHints } from "@/lib/workoutHints";

describe("buildExerciseLastHints", () => {
  it("skips workouts on the excluded calendar day", () => {
    const newer = "2026-06-15T14:00:00.000Z";
    const exclude = toLocalDateKey(new Date(newer));
    const hints = buildExerciseLastHints(
      [
        { date: newer, exercises: [{ name: "Squat", sets: 1, reps: 1, weight: 999 }] },
        { date: "2026-06-10T14:00:00.000Z", exercises: [{ name: "Squat", sets: 3, reps: 8, weight: 80 }] },
      ],
      exclude,
    );
    expect(hints.Squat?.weight).toBe(80);
  });

  it("takes first seen exercise when no day is excluded", () => {
    const hints = buildExerciseLastHints(
      [
        { date: "2026-06-15T14:00:00.000Z", exercises: [{ name: "Bench", sets: 3, reps: 5, weight: 60 }] },
        { date: "2026-06-10T14:00:00.000Z", exercises: [{ name: "Bench", sets: 3, reps: 10, weight: 50 }] },
      ],
      "2099-01-01",
    );
    expect(hints.Bench?.weight).toBe(60);
  });
});
