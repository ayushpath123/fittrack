import { describe, expect, it } from "vitest";
import { calculateAdherence, calculateMealTotals, calculateMovingAverage } from "../../lib/calculations";

describe("calculations", () => {
  it("calculates meal totals from multipliers", () => {
    const foods = [
      { id: "a", name: "A", baseQuantity: "1", baseWeightGrams: 100, calories: 100, protein: 10, carbs: 15, fat: 3, price: 10 },
      { id: "b", name: "B", baseQuantity: "1", baseWeightGrams: 100, calories: 200, protein: 20, carbs: 25, fat: 7, price: 20 },
    ];
    const items = [
      { foodId: "a", multiplier: 1 },
      { foodId: "b", multiplier: 0.5 },
    ];
    const out = calculateMealTotals(foods, items);
    expect(out.totalCalories).toBe(200);
    expect(out.totalProtein).toBe(20);
    expect(out.totalCarbs).toBe(27.5);
    expect(out.totalFat).toBe(6.5);
  });

  it("calculates moving average", () => {
    const logs = [
      { id: "1", date: "2024-01-01", weight: 72 },
      { id: "2", date: "2024-01-02", weight: 71 },
      { id: "3", date: "2024-01-03", weight: 70 },
    ];
    expect(calculateMovingAverage(logs, 2)).toEqual([72, 71.5, 70.5]);
  });

  it("calculates adherence percent from daily calorie totals", () => {
    const windowEnd = new Date(2024, 0, 2);
    const d1 = new Date(2024, 0, 1, 10, 0, 0).toISOString();
    const d2 = new Date(2024, 0, 2, 10, 0, 0).toISOString();
    const entries = [
      { id: "1", date: d1, mealType: "Breakfast", items: [], totalCalories: 1400, totalProtein: 100, totalCarbs: 0, totalFat: 0 },
      { id: "2", date: d2, mealType: "Breakfast", items: [], totalCalories: 1700, totalProtein: 100, totalCarbs: 0, totalFat: 0 },
    ];
    expect(calculateAdherence(entries, 1500, 2, windowEnd)).toBe(50);
  });

  it("sums meals on the same day for adherence", () => {
    const windowEnd = new Date(2024, 5, 10);
    const d = new Date(2024, 5, 10, 9, 0, 0).toISOString();
    const entries = [
      { id: "1", date: d, mealType: "Breakfast", items: [], totalCalories: 800, totalProtein: 40, totalCarbs: 0, totalFat: 0 },
      { id: "2", date: d, mealType: "Lunch", items: [], totalCalories: 800, totalProtein: 40, totalCarbs: 0, totalFat: 0 },
    ];
    expect(calculateAdherence(entries, 1500, 1, windowEnd)).toBe(0);
  });
});
