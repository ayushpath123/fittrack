import { prisma } from "@/lib/prisma";
import { endOfDay, startOfDay } from "@/lib/date";
import { MealsClient } from "./MealsClient";
import { FoodItemType, MealEntryType, MealEstimateType, MealItem, MealTemplateType } from "@/types";
import { requireUserId } from "@/lib/auth";

export default async function MealsPage() {
  const userId = await requireUserId();
  const today = new Date();
  const FOOD_CATALOG_LIMIT = 120;
  const [entries, foods, templates, goals, estimates] = await Promise.all([
    prisma.mealEntry.findMany({ where: { userId, date: { gte: startOfDay(today), lte: endOfDay(today) } }, orderBy: { date: "asc" } }),
    prisma.foodItem.findMany({
      orderBy: { name: "asc" },
      take: FOOD_CATALOG_LIMIT,
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
    prisma.mealEstimate.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 8 }),
  ]);
  const initialEntries: MealEntryType[] = entries.map((e) => ({
    ...e,
    date: e.date.toISOString(),
    items: e.items as unknown as MealItem[],
    totalCarbs: e.totalCarbs ?? 0,
    totalFat: e.totalFat ?? 0,
    estimateId: e.estimateId ?? null,
  }));
  const typedFoods = foods as unknown as FoodItemType[];
  const typedTemplates = templates as unknown as MealTemplateType[];
  const typedEstimates = estimates.map((e) => ({
    ...e,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  })) as MealEstimateType[];
  return (
    <MealsClient
      initialEntries={initialEntries}
      foods={typedFoods}
      templates={typedTemplates}
      initialEstimates={typedEstimates}
      calorieTarget={goals?.calorieTarget ?? 1500}
      proteinTarget={goals?.proteinTarget ?? 110}
      carbTarget={goals?.carbTarget ?? 180}
      fatTarget={goals?.fatTarget ?? 55}
    />
  );
}
