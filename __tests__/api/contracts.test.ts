import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireUserId: vi.fn(),
  requireUserIdFromRequest: vi.fn(),
  mealFindMany: vi.fn(),
  mealCreate: vi.fn(),
  foodFindMany: vi.fn(),
  estimateFindFirst: vi.fn(),
  estimateUpdateMany: vi.fn(),
  workoutLogFindMany: vi.fn(),
  workoutLogCreate: vi.fn(),
  workoutTemplateCount: vi.fn(),
  workoutTemplateFindMany: vi.fn(),
  workoutTemplateCreateMany: vi.fn(),
  workoutTemplateUpsert: vi.fn(),
  workoutTemplateUpdateMany: vi.fn(),
  weightFindMany: vi.fn(),
  weightUpsert: vi.fn(),
  goalsFindUnique: vi.fn(),
  goalsUpsert: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireUserId: mocks.requireUserId,
  requireUserIdFromRequest: mocks.requireUserIdFromRequest,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    mealEntry: {
      findMany: mocks.mealFindMany,
      create: mocks.mealCreate,
    },
    foodItem: {
      findMany: mocks.foodFindMany,
    },
    mealEstimate: {
      findFirst: mocks.estimateFindFirst,
      updateMany: mocks.estimateUpdateMany,
    },
    workoutLog: {
      findMany: mocks.workoutLogFindMany,
      create: mocks.workoutLogCreate,
    },
    workoutTemplate: {
      count: mocks.workoutTemplateCount,
      findMany: mocks.workoutTemplateFindMany,
      createMany: mocks.workoutTemplateCreateMany,
      upsert: mocks.workoutTemplateUpsert,
      updateMany: mocks.workoutTemplateUpdateMany,
    },
    weightLog: {
      findMany: mocks.weightFindMany,
      upsert: mocks.weightUpsert,
    },
    goalSetting: {
      findUnique: mocks.goalsFindUnique,
      upsert: mocks.goalsUpsert,
    },
    analyticsEvent: {
      create: vi.fn().mockResolvedValue({ id: "evt-1" }),
    },
  },
}));

import { GET as mealsGet, POST as mealsPost } from "@/app/api/meals/route";
import { GET as workoutGet, POST as workoutPost } from "@/app/api/workout/route";
import { GET as weightGet, POST as weightPost } from "@/app/api/weight/route";
import { GET as goalsGet, PUT as goalsPut } from "@/app/api/settings/goals/route";

describe("api contract tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUserId.mockResolvedValue("user-1");
    mocks.requireUserIdFromRequest.mockResolvedValue("user-1");
    mocks.mealFindMany.mockResolvedValue([{ id: "meal-1", mealType: "Breakfast" }]);
    mocks.mealCreate.mockResolvedValue({ id: "meal-2", mealType: "Lunch", totalCalories: 320 });
    mocks.foodFindMany.mockResolvedValue([{ id: "food-1", calories: 320, protein: 20, carbs: 30, fat: 10 }]);
    mocks.estimateFindFirst.mockResolvedValue(null);
    mocks.estimateUpdateMany.mockResolvedValue({ count: 1 });
    mocks.workoutLogFindMany.mockResolvedValue([]);
    mocks.workoutLogCreate.mockResolvedValue({
      id: "wl-1",
      userId: "user-1",
      workoutName: "Chest Workout",
      workoutType: "chest",
      duration: 45,
      caloriesBurned: 300,
      workoutDate: new Date("2026-05-01T10:00:00Z"),
      notes: null,
      createdAt: new Date("2026-05-01T10:00:00Z"),
      updatedAt: new Date("2026-05-01T10:00:00Z"),
    });
    mocks.workoutTemplateCount.mockResolvedValue(1);
    mocks.workoutTemplateFindMany.mockResolvedValue([]);
    mocks.workoutTemplateCreateMany.mockResolvedValue({ count: 0 });
    mocks.workoutTemplateUpsert.mockResolvedValue({ id: "wtpl-1" });
    mocks.workoutTemplateUpdateMany.mockResolvedValue({ count: 1 });
    mocks.weightFindMany.mockResolvedValue([{ id: "wt-1", weight: 75 }]);
    mocks.weightUpsert.mockResolvedValue({ id: "wt-2", weight: 74.5, waistCm: 82 });
    mocks.goalsFindUnique.mockResolvedValue({ calorieTarget: 2000, proteinTarget: 120 });
    mocks.goalsUpsert.mockResolvedValue({ calorieTarget: 2100, proteinTarget: 130 });
  });

  it("meals GET returns array payload", async () => {
    const req = new NextRequest("http://localhost/api/meals?date=2026-05-01");
    const res = await mealsGet(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json)).toBe(true);
    expect(json[0]).toMatchObject({ id: "meal-1" });
  });

  it("meals POST returns 400 error contract for invalid body", async () => {
    const req = new NextRequest("http://localhost/api/meals", {
      method: "POST",
      body: JSON.stringify({ date: "2026-05-01" }),
    });
    const res = await mealsPost(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty("error");
    expect(json).toHaveProperty("details");
  });

  it("workout GET returns array contract", async () => {
    const req = new NextRequest("http://localhost/api/workout?date=2026-05-01");
    const res = await workoutGet(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json)).toBe(true);
  });

  it("workout POST returns created workout log contract", async () => {
    const req = new NextRequest("http://localhost/api/workout", {
      method: "POST",
      body: JSON.stringify({
        workoutName: "Chest Workout",
        workoutType: "chest",
        duration: 45,
        caloriesBurned: 300,
      }),
    });
    const res = await workoutPost(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("id");
    expect(json).toHaveProperty("workoutName", "Chest Workout");
    expect(json).toHaveProperty("caloriesBurned", 300);
  });

  it("weight GET returns list contract", async () => {
    const req = new NextRequest("http://localhost/api/weight?range=7d");
    const res = await weightGet(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json)).toBe(true);
  });

  it("weight POST returns 400 error contract for invalid payload", async () => {
    const req = new NextRequest("http://localhost/api/weight", {
      method: "POST",
      body: JSON.stringify({ date: "2026-05-01", weight: -3 }),
    });
    const res = await weightPost(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty("error");
    expect(json).toHaveProperty("details");
  });

  it("goals GET returns defaults when unset", async () => {
    mocks.goalsFindUnique.mockResolvedValueOnce(null);
    const req = new NextRequest("http://localhost/api/settings/goals");
    const res = await goalsGet(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("calorieTarget");
    expect(json).toHaveProperty("proteinTarget");
  });

  it("goals PUT returns 401 contract when unauthorized", async () => {
    mocks.requireUserIdFromRequest.mockRejectedValueOnce(new Error("unauthorized"));
    const req = new NextRequest("http://localhost/api/settings/goals", {
      method: "PUT",
      body: JSON.stringify({ calorieTarget: 1800, proteinTarget: 120 }),
    });
    const res = await goalsPut(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toEqual({ error: "Unauthorized" });
  });
});
