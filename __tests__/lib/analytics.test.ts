import { describe, expect, it } from "vitest";
import {
  buildWeeklyAnalyticsBuckets,
  calculateWeightTrendDeltas,
  dailyCalorieCoefficientOfVariation,
  deriveAnalyticsInsights,
} from "../../lib/calculations";

describe("analytics helpers", () => {
  it("builds weekly buckets with avg daily nutrition and workouts", () => {
    const start = new Date(2026, 3, 6);
    const end = new Date(2026, 3, 12);
    const meals = [
      {
        id: "1",
        date: new Date(2026, 3, 8, 12, 0, 0).toISOString(),
        mealType: "Breakfast",
        items: [],
        totalCalories: 7000,
        totalProtein: 140,
        totalCarbs: 0,
        totalFat: 0,
      },
    ];
    const workouts = [{ date: new Date(2026, 3, 9, 9, 0, 0) }];
    const buckets = buildWeeklyAnalyticsBuckets(meals, workouts, start, end);
    expect(buckets).toHaveLength(1);
    expect(buckets[0].workoutCount).toBe(1);
    expect(buckets[0].loggedDays).toBe(1);
    expect(buckets[0].avgDailyCalories).toBe(1000);
    expect(buckets[0].avgDailyProtein).toBe(20);
    expect(buckets[0].avgDailyCarbs).toBe(0);
    expect(buckets[0].avgDailyFat).toBe(0);
  });

  it("calculates weight deltas vs ~7d and ~30d lookback from latest log", () => {
    const out = calculateWeightTrendDeltas([
      { id: "1", date: "2026-03-01", weight: 76 },
      { id: "2", date: "2026-04-01", weight: 75 },
      { id: "3", date: "2026-04-07", weight: 74.5 },
      { id: "4", date: "2026-04-14", weight: 74.0 },
    ]);
    expect(out.weeklyDelta).toBe(-0.5);
    expect(out.monthlyDelta).toBe(-2);
  });

  it("derives insights with confidence and optional sample hints", () => {
    const insights = deriveAnalyticsInsights({
      adherence7d: 80,
      adherence30d: 60,
      weeklyWeightDelta: -0.4,
      intakeCoeffVar: 0.1,
      intakeSampleDays: 30,
      workoutsPerWeek: 3,
      periodDays: 30,
    });
    expect(insights.length).toBeGreaterThan(0);
    expect(insights.length).toBeLessThanOrEqual(5);
    expect(["low", "medium", "high"]).toContain(insights[0].confidence);
    expect(insights.some((i) => i.text.length > 20)).toBe(true);
  });

  it("computes calorie coefficient of variation for logged days", () => {
    const meals = [1, 2, 3].map((day, idx) => ({
      id: String(idx),
      date: new Date(2026, 3, day, 12, 0, 0).toISOString(),
      mealType: "Breakfast",
      items: [] as never[],
      totalCalories: idx === 0 ? 1000 : idx === 1 ? 2000 : 1500,
      totalProtein: 50,
      totalCarbs: 0,
      totalFat: 0,
    }));
    const start = new Date(2026, 3, 1);
    const end = new Date(2026, 3, 3);
    const cv = dailyCalorieCoefficientOfVariation(meals, start, end);
    expect(cv).not.toBeNull();
    expect(cv!).toBeGreaterThan(0);
  });
});
