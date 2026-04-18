import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireUserId: vi.fn(),
  findManyMeals: vi.fn(),
  findManyWorkouts: vi.fn(),
  findManyWeights: vi.fn(),
  findUniqueGoals: vi.fn(),
  queryRaw: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireUserId: mocks.requireUserId,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    mealEntry: { findMany: mocks.findManyMeals },
    workout: { findMany: mocks.findManyWorkouts },
    weightLog: { findMany: mocks.findManyWeights },
    goalSetting: { findUnique: mocks.findUniqueGoals },
    $queryRaw: mocks.queryRaw,
  },
}));

import { GET } from "@/app/api/analytics/summary/route";

describe("analytics summary route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUserId.mockResolvedValue("user-1");
    mocks.findManyMeals.mockResolvedValue([]);
    mocks.findManyWorkouts.mockResolvedValue([]);
    mocks.findManyWeights.mockResolvedValue([]);
    mocks.findUniqueGoals.mockResolvedValue({ calorieTarget: 2000, proteinTarget: 120 });
    mocks.queryRaw.mockResolvedValue([]);
  });

  it("returns summary payload for a valid range", async () => {
    const req = new NextRequest("http://localhost/api/analytics/summary?range=7d");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.range).toBe("7d");
    expect(json.targets.calorieTarget).toBe(2000);
    expect(json.summary.adherence7d).toBeDefined();
    expect(json.summary.adherence30d).toBeDefined();
    expect(Array.isArray(json.charts.weekly)).toBe(true);
    expect(json.charts.weightSeries).toEqual([]);
    expect(res.headers.get("Cache-Control")).toContain("private");
  });

  it("rejects an unsupported range", async () => {
    const req = new NextRequest("http://localhost/api/analytics/summary?range=365d");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("defaults range to 30d when param is missing", async () => {
    const req = new NextRequest("http://localhost/api/analytics/summary");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.range).toBe("30d");
  });
});
