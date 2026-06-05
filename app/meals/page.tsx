import { prisma } from "@/lib/prisma";
import { endOfDay, getDaysAgo, startOfDay, toLocalDateKey } from "@/lib/date";
import { mealLoggingStreakEndingYesterday } from "@/lib/meal-logging-streak";
import { buildLoggableTemplates, normalizeMealType } from "@/lib/meal-templates";
import { MealsClient } from "./MealsClient";
import { FoodItemType, MealEntryType, MealItem, MealTemplateType } from "@/types";
import { requireUserIdForPage } from "@/lib/auth";

const MEAL_SLOTS = ["breakfast", "lunch", "snack", "dinner"] as const;

export default async function MealsPage({
  searchParams,
}: {
  searchParams: Promise<{ slot?: string }>;
}) {
  const userId = await requireUserIdForPage();
  const sp = await searchParams;
  const slotRaw = sp.slot ? normalizeMealType(sp.slot) : undefined;
  const initialSlot = MEAL_SLOTS.includes(slotRaw as (typeof MEAL_SLOTS)[number])
    ? slotRaw
    : undefined;
  const today = new Date();
  const [entries, foods, templates, goals, streakMeals] = await Promise.all([
    prisma.mealEntry.findMany({ where: { userId, date: { gte: startOfDay(today), lte: endOfDay(today) } }, orderBy: { date: "asc" } }),
    prisma.foodItem.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        baseQuantity: true,
        baseWeightGrams: true,
        calories: true,
        protein: true,
        carbs: true,
        fat: true,
        price: true,
        barcode: true,
      },
    }),
    prisma.mealTemplate.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
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

  const logTemplates = buildLoggableTemplates(
    targets,
    templates as unknown as MealTemplateType[],
    foods as unknown as FoodItemType[],
  );

  return (
    <MealsClient
      initialEntries={initialEntries}
      logTemplates={logTemplates}
      targets={targets}
      initialSlot={initialSlot}
      streakAfterFirstLogToday={streakAfterFirstLogToday}
    />
  );
}
