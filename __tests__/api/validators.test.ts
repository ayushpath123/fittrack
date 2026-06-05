import { describe, expect, it } from "vitest";
import {
  goalsPayloadSchema,
  mealPayloadSchema,
  weightPatchSchema,
  weightPayloadSchema,
  workoutLogPayloadSchema,
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

  it("accepts macro-only meal payload", () => {
    expect(
      mealPayloadSchema.safeParse({
        date: "2026-01-01",
        mealType: "lunch",
        items: [],
        macros: { calories: 520, protein: 40, carbs: 55, fat: 14 },
      }).success,
    ).toBe(true);
  });

  it("rejects invalid workout payload", () => {
    const payload = { date: "2026-01-01", exercises: [] };
    expect(workoutPayloadSchema.safeParse(payload).success).toBe(false);
  });

  it("accepts valid workout log payload", () => {
    expect(
      workoutLogPayloadSchema.safeParse({
        workoutName: "Chest Workout",
        workoutType: "chest",
        duration: 45,
        caloriesBurned: 300,
      }).success,
    ).toBe(true);
  });

  it("rejects workout log with missing name", () => {
    expect(
      workoutLogPayloadSchema.safeParse({
        workoutName: "",
        workoutType: "chest",
        duration: 45,
        caloriesBurned: 300,
      }).success,
    ).toBe(false);
  });

  it("rejects invalid weight payload", () => {
    expect(weightPayloadSchema.safeParse({ date: "2026-01-01", weight: -5 }).success).toBe(false);
    expect(weightPayloadSchema.safeParse({ date: "2026-01-01", weight: 10 }).success).toBe(false);
    expect(weightPayloadSchema.safeParse({ date: "2026-01-01", weight: 350 }).success).toBe(false);
  });

  it("accepts valid weight in kg range", () => {
    expect(weightPayloadSchema.safeParse({ date: "2026-01-01", weight: 72.5 }).success).toBe(true);
    expect(weightPayloadSchema.safeParse({ date: "2026-01-01", weight: 20 }).success).toBe(true);
    expect(weightPayloadSchema.safeParse({ date: "2026-01-01", weight: 300 }).success).toBe(true);
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
