import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateMealTotals } from "@/lib/calculations";
import { endOfDay, getDaysAgo, startOfDay } from "@/lib/date";
import { ensureDefaultMealTemplates } from "@/lib/default-meal-templates";
import type { MacroSnapshot } from "@/lib/meal-templates";
import type { ExerciseEntryType, FoodItemType, MealItem } from "@/types";

export async function listMealsForDate(userId: string, dateStr?: string) {
  const normalizedDate = dateStr ?? new Date().toISOString().split("T")[0];
  const date = new Date(normalizedDate);

  return prisma.mealEntry.findMany({
    where: { userId, date: { gte: startOfDay(date), lte: endOfDay(date) } },
    orderBy: { date: "asc" },
  });
}

export async function createMealForDay(params: {
  userId: string;
  date: string;
  mealType: string;
  items: MealItem[];
  estimateId?: string;
  macros?: MacroSnapshot;
}) {
  const { userId, date, mealType, items, estimateId, macros } = params;

  if (items.length === 0 && !estimateId && !macros) {
    return { error: { status: 400, message: "Provide food items, macros, or an estimate." } as const };
  }

  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let storedItems: MealItem[] | Prisma.JsonArray = items as unknown as Prisma.JsonArray;

  if (macros) {
    totalCalories = macros.calories;
    totalProtein = macros.protein;
    totalCarbs = macros.carbs;
    totalFat = macros.fat;
    storedItems = [{ kind: "macros", ...macros }] as unknown as Prisma.JsonArray;
  } else if (items.length > 0) {
    const foods = await prisma.foodItem.findMany({ where: { id: { in: items.map((i) => i.foodId) } } });
    const totals = calculateMealTotals(foods as unknown as FoodItemType[], items);
    totalCalories = totals.totalCalories;
    totalProtein = totals.totalProtein;
    totalCarbs = totals.totalCarbs;
    totalFat = totals.totalFat;
  } else if (estimateId) {
    const estimate = await prisma.mealEstimate.findFirst({ where: { id: estimateId, userId } });
    if (!estimate) {
      return { error: { status: 404, message: "Estimate not found." } as const };
    }
    totalCalories = estimate.calories;
    totalProtein = estimate.protein;
    totalCarbs = estimate.carbs;
    totalFat = estimate.fat;
  }

  const now = new Date();
  const mealDate = new Date(date);
  mealDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

  const entry = await prisma.mealEntry.create({
    data: {
      userId,
      date: mealDate,
      mealType,
      estimateId: estimateId ?? null,
      items: storedItems,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat,
    },
  });

  if (estimateId) {
    await prisma.mealEstimate.updateMany({
      where: { id: estimateId, userId },
      data: { status: "used", linkedMealEntryId: entry.id },
    });
  }

  return { entry };
}

export async function getWorkoutForDate(userId: string, dateStr?: string) {
  const normalizedDate = dateStr ?? new Date().toISOString().split("T")[0];
  const date = new Date(normalizedDate);
  return prisma.workout.findFirst({
    where: { userId, date: { gte: startOfDay(date), lte: endOfDay(date) } },
    orderBy: { date: "desc" },
    include: { exercises: true },
  });
}

export async function upsertWorkoutForDate(params: {
  userId: string;
  date: string;
  exercises: ExerciseEntryType[];
  caloriesBurned?: number;
}) {
  const { userId, date, exercises, caloriesBurned } = params;
  const day = new Date(date);
  const existing = await prisma.workout.findFirst({
    where: { userId, date: { gte: startOfDay(day), lte: endOfDay(day) } },
  });

  if (existing) {
    return prisma.workout.update({
      where: { id: existing.id },
      data: {
        ...(caloriesBurned !== undefined ? { caloriesBurned } : {}),
        exercises: {
          deleteMany: {},
          create: exercises.map(({ name, sets, reps, weight }) => ({ name, sets, reps, weight })),
        },
      },
      include: { exercises: true },
    });
  }

  return prisma.workout.create({
    data: {
      userId,
      date: startOfDay(day),
      ...(caloriesBurned !== undefined ? { caloriesBurned } : {}),
      exercises: { create: exercises.map(({ name, sets, reps, weight }) => ({ name, sets, reps, weight })) },
    },
    include: { exercises: true },
  });
}

export async function listWeightLogs(userId: string, range?: string) {
  const days = range === "90d" ? 90 : range === "30d" ? 30 : 7;
  return prisma.weightLog.findMany({
    where: { userId, date: { gte: getDaysAgo(days - 1) } },
    orderBy: { date: "asc" },
  });
}

export async function upsertWeightLog(params: { userId: string; date: string; weight: number; waistCm?: number }) {
  const { userId, date, weight, waistCm } = params;
  const day = startOfDay(new Date(date));
  return prisma.weightLog.upsert({
    where: { userId_date: { userId, date: day } },
    update: { weight, ...(waistCm !== undefined ? { waistCm } : {}) },
    create: { userId, date: day, weight, ...(waistCm !== undefined ? { waistCm } : {}) },
  });
}

export async function getGoalsForUser(userId: string) {
  const goals = await prisma.goalSetting.findUnique({ where: { userId } });
  return (
    goals ?? {
      calorieTarget: 1500,
      proteinTarget: 110,
      carbTarget: 180,
      fatTarget: 55,
      waterTargetMl: 2000,
      reminderEnabled: false,
      reminderTime: "09:00",
    }
  );
}

export async function saveGoalsForUser(userId: string, payload: Record<string, unknown>) {
  const goals = await prisma.goalSetting.upsert({
    where: { userId },
    update: payload,
    create: { userId, ...payload },
  });

  await ensureDefaultMealTemplates(userId, {
    calories: goals.calorieTarget,
    protein: goals.proteinTarget,
    carbs: goals.carbTarget,
    fat: goals.fatTarget,
  });

  return goals;
}
