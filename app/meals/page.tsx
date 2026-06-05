import { prisma } from "@/lib/prisma";
import { endOfDay, getDaysAgo, startOfDay, toLocalDateKey } from "@/lib/date";
import { mealLoggingStreakEndingYesterday } from "@/lib/meal-logging-streak";
import { listMealTemplates } from "@/lib/meal-template-service";
import { detectMealTypeFromTime, normalizeMealType } from "@/lib/meal-templates";
import { MealsClient } from "./MealsClient";
import { MealEntryType, MealItem } from "@/types";
import { requireUserIdForPage } from "@/lib/auth";

const MEAL_SLOTS = ["breakfast", "lunch", "snack", "dinner"] as const;

export default async function MealsPage({
  searchParams,
}: {
  searchParams: Promise<{ slot?: string; action?: string }>;
}) {
  const userId = await requireUserIdForPage();
  const sp = await searchParams;
  const slotRaw = sp.slot ? normalizeMealType(sp.slot) : undefined;
  const initialSlot = MEAL_SLOTS.includes(slotRaw as (typeof MEAL_SLOTS)[number])
    ? slotRaw
    : detectMealTypeFromTime();
  const openAddMeal = sp.action === "add" || sp.action === "log";

  const today = new Date();
  const [entries, templates, goals, streakMeals] = await Promise.all([
    prisma.mealEntry.findMany({
      where: { userId, date: { gte: startOfDay(today), lte: endOfDay(today) } },
      orderBy: { date: "asc" },
    }),
    listMealTemplates(userId),
    prisma.goalSetting.findUnique({ where: { userId } }),
    prisma.mealEntry.findMany({
      where: { userId, date: { gte: getDaysAgo(400) } },
      select: { date: true },
    }),
  ]);

  const streakLoggedDays = new Set(streakMeals.map((m) => toLocalDateKey(new Date(m.date))));
  const streakAfterFirstLogToday = mealLoggingStreakEndingYesterday(streakLoggedDays) + 1;

  const targets = {
    calories: goals?.calorieTarget ?? 1500,
    protein: goals?.proteinTarget ?? 110,
    carbs: goals?.carbTarget ?? 180,
    fat: goals?.fatTarget ?? 55,
  };

  const initialEntries: MealEntryType[] = entries.map((e) => ({
    ...e,
    date: e.date.toISOString(),
    items: e.items as unknown as MealItem[],
    totalCarbs: e.totalCarbs ?? 0,
    totalFat: e.totalFat ?? 0,
    estimateId: e.estimateId ?? null,
  }));

  return (
    <MealsClient
      initialEntries={initialEntries}
      templates={templates}
      targets={targets}
      initialSlot={initialSlot}
      streakAfterFirstLogToday={streakAfterFirstLogToday}
      openAddMeal={openAddMeal}
    />
  );
}
