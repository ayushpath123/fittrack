import { describe, expect, it } from "vitest";
import {
  goalsPayloadSchema,
  mealPayloadSchema,
  weightPatchSchema,
  weightPayloadSchema,
  workoutPayloadSchema,
} from "../../lib/validators";

describe("api payload validators", () => {
  it("accepts valid meal payload", () => {
    const payload = {
      date: "2026-01-01",
      mealType: "Breakfast",
      items: [{ foodId: "x", multiplier: 1 }],
    };
    expect(mealPayloadSchema.safeParse(payload).success).toBe(true);
  });

  it("rejects invalid workout payload", () => {
    const payload = { date: "2026-01-01", exercises: [] };
    expect(workoutPayloadSchema.safeParse(payload).success).toBe(false);
  });

  it("rejects invalid weight payload", () => {
    expect(weightPayloadSchema.safeParse({ date: "2026-01-01", weight: -5 }).success).toBe(false);
  });

  it("accepts goals payload", () => {
    expect(goalsPayloadSchema.safeParse({ calorieTarget: 1800, proteinTarget: 130 }).success).toBe(true);
  });

  it("accepts goals with reminder fields", () => {
    expect(
      goalsPayloadSchema.safeParse({
        calorieTarget: 1800,
        proteinTarget: 130,
        carbTarget: 200,
        fatTarget: 60,
        reminderEnabled: true,
        reminderTime: "08:30",
      }).success,
    ).toBe(true);
  });

  it("accepts weight payload with optional waist", () => {
    expect(weightPayloadSchema.safeParse({ date: "2026-01-01", weight: 70, waistCm: 82 }).success).toBe(true);
  });

  it("accepts weight PATCH with waist clear", () => {
    expect(weightPatchSchema.safeParse({ waistCm: null }).success).toBe(true);
  });
});
