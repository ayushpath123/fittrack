import { describe, expect, it } from "vitest";
import {
  averageOfLastN,
  computeWeightAnalytics,
  generateWeightInsights,
  getTrendStatus,
  validateWeightInput,
} from "@/lib/weight-analytics";
import type { WeightLogType } from "@/types";

function log(day: number, weight: number): WeightLogType {
  return {
    id: `log-${day}`,
    date: new Date(2026, 0, day).toISOString(),
    weight,
  };
}

describe("weight analytics", () => {
  it("computes averages from last N entries", () => {
    expect(averageOfLastN([70, 72, 74], 7)).toBe(72);
    expect(averageOfLastN([70, 72, 74], 2)).toBe(73);
  });

  it("classifies trend status", () => {
    expect(getTrendStatus(-0.8)).toBe("losing");
    expect(getTrendStatus(0.8)).toBe("gaining");
    expect(getTrendStatus(0.2)).toBe("stable");
  });

  it("computes full analytics snapshot", () => {
    const logs = [log(1, 80), log(8, 78), log(15, 76), log(22, 74), log(29, 72.5)];
    const a = computeWeightAnalytics(logs);
    expect(a.currentWeight).toBe(72.5);
    expect(a.startingWeight).toBe(80);
    expect(a.totalChange).toBe(-7.5);
    expect(a.lowest).toBe(72.5);
    expect(a.highest).toBe(80);
  });

  it("generates short insights", () => {
    const logs = Array.from({ length: 14 }, (_, i) => log(i + 1, 80 - i * 0.2));
    const analytics = computeWeightAnalytics(logs);
    const insights = generateWeightInsights(analytics, logs);
    expect(insights.length).toBeGreaterThan(0);
    expect(insights[0].length).toBeLessThan(120);
  });

  it("validates weight input bounds", () => {
    expect(validateWeightInput("")).toMatch(/required/i);
    expect(validateWeightInput("abc")).toMatch(/valid number/i);
    expect(validateWeightInput("10")).toMatch(/20/);
    expect(validateWeightInput("350")).toMatch(/300/);
    expect(validateWeightInput("72.5")).toBeNull();
  });
});
