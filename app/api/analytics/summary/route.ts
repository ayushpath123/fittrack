import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addDays, getDaysAgo, startOfDay, toLocalDateKey } from "@/lib/date";
import { requireUserId } from "@/lib/auth";
import {
  buildWeeklyAnalyticsBuckets,
  calculateAdherence,
  calculateFatLossProjection,
  calculateWeightTrendDeltas,
  dailyCalorieCoefficientOfVariation,
  deriveAnalyticsInsights,
} from "@/lib/calculations";
import { analyticsQuerySchema } from "@/lib/validators";
import { MealEntryType, WeightLogType } from "@/types";

type DailyNutritionRow = {
  day: Date;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type DailyWorkoutRow = {
  day: Date;
  count: bigint | number;
};

export async function GET(req: NextRequest) {
  const userId = await requireUserId();
  const rangeResult = analyticsQuerySchema.safeParse({
    range: req.nextUrl.searchParams.get("range") ?? undefined,
  });
  if (!rangeResult.success) {
    return NextResponse.json({ error: "Invalid analytics range", details: rangeResult.error.flatten() }, { status: 400 });
  }
  const range = rangeResult.data.range;
  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  const rangeEnd = startOfDay(new Date());
  const rangeStart = getDaysAgo(days - 1);
  const mealSince = getDaysAgo(Math.max(days - 1, 29));
  const rangeStartKey = toLocalDateKey(rangeStart);
  const rangeEndKey = toLocalDateKey(rangeEnd);

  const [meals, workouts, weights, goals, dailyNutritionRows, dailyWorkoutRows] = await Promise.all([
    prisma.mealEntry.findMany({
      where: { userId, date: { gte: mealSince } },
      orderBy: { date: "asc" },
      select: {
        id: true,
        date: true,
        mealType: true,
        totalCalories: true,
        totalProtein: true,
        totalCarbs: true,
        totalFat: true,
      },
    }),
    prisma.workout.findMany({ where: { userId, date: { gte: rangeStart } }, orderBy: { date: "asc" } }),
    prisma.weightLog.findMany({ where: { userId, date: { gte: rangeStart } }, orderBy: { date: "asc" } }),
    prisma.goalSetting.findUnique({ where: { userId } }),
    prisma.$queryRaw<DailyNutritionRow[]>`
      SELECT
        DATE("date") AS day,
        COALESCE(SUM("totalCalories"), 0)::double precision AS calories,
        COALESCE(SUM("totalProtein"), 0)::double precision AS protein,
        COALESCE(SUM("totalCarbs"), 0)::double precision AS carbs,
        COALESCE(SUM("totalFat"), 0)::double precision AS fat
      FROM "MealEntry"
      WHERE "userId" = ${userId}
        AND "date" >= ${rangeStart}
        AND "date" < ${addDays(rangeEnd, 1)}
      GROUP BY DATE("date")
      ORDER BY DATE("date") ASC
    `,
    prisma.$queryRaw<DailyWorkoutRow[]>`
      SELECT DATE("date") AS day, COUNT(*) AS count
      FROM "Workout"
      WHERE "userId" = ${userId}
        AND "date" >= ${rangeStart}
        AND "date" < ${addDays(rangeEnd, 1)}
      GROUP BY DATE("date")
      ORDER BY DATE("date") ASC
    `,
  ]);

  const calorieTarget = goals?.calorieTarget ?? 1500;
  const proteinTarget = goals?.proteinTarget ?? 110;
  const carbTarget = goals?.carbTarget ?? 180;
  const fatTarget = goals?.fatTarget ?? 55;

  const entriesAll: MealEntryType[] = meals.map((m) => ({
    id: m.id,
    date: m.date.toISOString(),
    mealType: m.mealType,
    items: [],
    totalCalories: m.totalCalories,
    totalProtein: m.totalProtein,
    totalCarbs: m.totalCarbs ?? 0,
    totalFat: m.totalFat ?? 0,
  }));

  const entriesInRange = entriesAll.filter((e) => {
    const k = toLocalDateKey(new Date(e.date));
    return k >= rangeStartKey && k <= rangeEndKey;
  });

  const dailyInRange = new Map<string, { calories: number; protein: number; carbs: number; fat: number }>();
  for (const row of dailyNutritionRows) {
    const key = toLocalDateKey(new Date(row.day));
    dailyInRange.set(key, {
      calories: Number(row.calories ?? 0),
      protein: Number(row.protein ?? 0),
      carbs: Number(row.carbs ?? 0),
      fat: Number(row.fat ?? 0),
    });
  }
  let sumCals = 0;
  let sumProt = 0;
  let sumCarbs = 0;
  let sumFat = 0;
  for (let i = 0; i < days; i++) {
    const d = addDays(rangeEnd, -i);
    const k = toLocalDateKey(d);
    const t = dailyInRange.get(k);
    sumCals += t?.calories ?? 0;
    sumProt += t?.protein ?? 0;
    sumCarbs += t?.carbs ?? 0;
    sumFat += t?.fat ?? 0;
  }
  const avgCalories = Math.round(sumCals / days);
  const avgProtein = Math.round((sumProt / days) * 10) / 10;
  const avgCarbs = Math.round((sumCarbs / days) * 10) / 10;
  const avgFat = Math.round((sumFat / days) * 10) / 10;

  const adherenceWindow = calculateAdherence(entriesAll, calorieTarget, days, rangeEnd);
  const adherence7d = calculateAdherence(entriesAll, calorieTarget, 7, rangeEnd);
  const adherence30d = calculateAdherence(entriesAll, calorieTarget, 30, rangeEnd);

  const weightSeries: WeightLogType[] = weights.map((w) => ({
    id: w.id,
    date: w.date.toISOString(),
    weight: w.weight,
  }));
  const weightTrend = calculateWeightTrendDeltas(weightSeries);

  const weeklyBuckets = buildWeeklyAnalyticsBuckets(
    entriesInRange,
    workouts.map((w) => ({ date: w.date })),
    rangeStart,
    rangeEnd,
  );
  const workoutsByDate = new Map<string, number>();
  for (const row of dailyWorkoutRows) {
    workoutsByDate.set(toLocalDateKey(new Date(row.day)), Number(row.count ?? 0));
  }

  let intakeSampleDays = 0;
  for (let i = 0; i < days; i++) {
    const d = addDays(rangeEnd, -i);
    const k = toLocalDateKey(d);
    const t = dailyInRange.get(k);
    if (t && (t.calories > 0 || t.protein > 0 || t.carbs > 0 || t.fat > 0)) intakeSampleDays++;
  }

  const intakeCv = dailyCalorieCoefficientOfVariation(entriesInRange, rangeStart, rangeEnd);
  const workoutCount = workouts.length;
  const workoutsPerWeek = workoutCount / Math.max(1, days / 7);

  const avgDeficit = Math.max(0, calorieTarget - avgCalories);
  const projectedFatLoss = calculateFatLossProjection(avgDeficit);

  const insights = deriveAnalyticsInsights({
    adherence7d,
    adherence30d,
    weeklyWeightDelta: weightTrend.weeklyDelta,
    intakeCoeffVar: intakeCv,
    intakeSampleDays,
    workoutsPerWeek,
    periodDays: days,
  });

  const body = {
    range,
    targets: { calorieTarget, proteinTarget, carbTarget, fatTarget },
    summary: {
      avgCalories,
      avgProtein,
      avgCarbs,
      avgFat,
      adherence: adherenceWindow,
      adherence7d,
      adherence30d,
      projectedFatLoss,
      workoutCount,
      weightTrend,
    },
    charts: {
      weekly: weeklyBuckets,
      daily: Array.from({ length: days }, (_, i) => {
        const d = addDays(rangeStart, i);
        const k = toLocalDateKey(d);
        const totals = dailyInRange.get(k);
        return {
          date: d.toISOString(),
          label: d.toLocaleDateString("en", { month: "short", day: "numeric" }),
          calories: totals?.calories ?? 0,
          protein: totals?.protein ?? 0,
          carbs: totals?.carbs ?? 0,
          fat: totals?.fat ?? 0,
          workoutCount: workoutsByDate.get(k) ?? 0,
          steps: 0,
        };
      }),
      weightSeries,
    },
    insights,
  };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "private, max-age=60, stale-while-revalidate=120",
    },
  });
}
