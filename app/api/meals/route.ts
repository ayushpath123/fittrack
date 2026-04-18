import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { endOfDay, startOfDay } from "@/lib/date";
import { calculateMealTotals } from "@/lib/calculations";
import { FoodItemType, MealItem } from "@/types";
import { Prisma } from "@prisma/client";
import { requireUserId } from "@/lib/auth";
import { mealPayloadSchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
  const userId = await requireUserId();
  const dateStr = req.nextUrl.searchParams.get("date") ?? new Date().toISOString().split("T")[0];
  const date = new Date(dateStr);
  const entries = await prisma.mealEntry.findMany({
    where: { userId, date: { gte: startOfDay(date), lte: endOfDay(date) } },
    orderBy: { date: "asc" },
  });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  const parsed = mealPayloadSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid meal payload", details: parsed.error.flatten() }, { status: 400 });
  }
  const { date, mealType, items, estimateId } = parsed.data as { date: string; mealType: string; items: MealItem[]; estimateId?: string };
  if (items.length === 0 && !estimateId) {
    return NextResponse.json({ error: "At least one item or estimateId is required." }, { status: 400 });
  }

  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  if (items.length > 0) {
    const foods = await prisma.foodItem.findMany({ where: { id: { in: items.map((i) => i.foodId) } } });
    const totals = calculateMealTotals(foods as unknown as FoodItemType[], items);
    totalCalories = totals.totalCalories;
    totalProtein = totals.totalProtein;
    totalCarbs = totals.totalCarbs;
    totalFat = totals.totalFat;
  } else if (estimateId) {
    const estimate = await prisma.mealEstimate.findFirst({ where: { id: estimateId, userId } });
    if (!estimate) {
      return NextResponse.json({ error: "Estimate not found." }, { status: 404 });
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
      items: items as unknown as Prisma.JsonArray,
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
  return NextResponse.json(entry);
}
