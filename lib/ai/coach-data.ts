import { buildUserContext } from "@/lib/ai/user-state";
import type { CoachFetchedData } from "@/lib/ai/coachAgent";
import { endOfDay, getDaysAgo, startOfDay, toLocalDateKey } from "@/lib/date";
import { prisma } from "@/lib/prisma";

export async function buildCoachFetchedData(userId: string): Promise<CoachFetchedData> {
  const now = new Date();
  const dayStart = startOfDay(now);
  const weekStart = getDaysAgo(6);
  const todayKey = toLocalDateKey(now);

  const [userContext, goals, todayMeals, weekMeals, hydration, weightLogs, weekWorkouts] = await Promise.all([
    buildUserContext(userId),
    prisma.goalSetting.findUnique({ where: { userId } }),
    prisma.mealEntry.findMany({
      where: { userId, date: { gte: dayStart, lte: endOfDay(now) } },
      select: { totalCalories: true, totalProtein: true },
    }),
    prisma.mealEntry.findMany({
      where: { userId, date: { gte: weekStart, lte: endOfDay(now) } },
      select: { date: true, totalCalories: true },
    }),
    prisma.hydrationLog.findUnique({ where: { userId_date: { userId, date: dayStart } } }),
    prisma.weightLog.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 10,
      select: { weight: true, date: true },
    }),
    prisma.workoutLog.findMany({
      where: { userId, workoutDate: { gte: weekStart, lte: endOfDay(now) } },
      select: { workoutDate: true },
    }),
  ]);

  const calorieTarget = goals?.calorieTarget ?? userContext.calorie_target;
  const proteinTarget = goals?.proteinTarget ?? userContext.protein_target;
  const waterGoalMl = goals?.waterTargetMl ?? 2000;

  const caloriesSoFar = todayMeals.reduce((sum, meal) => sum + meal.totalCalories, 0);
  const proteinSoFar = todayMeals.reduce((sum, meal) => sum + meal.totalProtein, 0);

  const daysWithMealsLogged = new Set(weekMeals.map((meal) => toLocalDateKey(new Date(meal.date)))).size;
  const completedWorkouts = new Set(weekWorkouts.map((w) => toLocalDateKey(new Date(w.workoutDate)))).size;

  const latestKg = weightLogs[0]?.weight ?? null;
  const priorKg = weightLogs[1]?.weight ?? null;
  const deltaKg =
    latestKg !== null && priorKg !== null ? Math.round((latestKg - priorKg) * 10) / 10 : null;

  return {
    userContext: userContext as unknown as Record<string, unknown>,
    targets: { calorieTarget, proteinTarget, waterGoalMl },
    today: {
      localDate: todayKey,
      caloriesSoFar,
      proteinSoFar,
      mealsLogged: todayMeals.length,
      caloriesRemaining: Math.max(0, calorieTarget - caloriesSoFar),
      hydrationMl: hydration?.totalMl ?? null,
    },
    rolling7d: {
      daysWithMealsLogged,
      totalCalories: weekMeals.reduce((sum, meal) => sum + meal.totalCalories, 0),
      completedWorkouts,
    },
    weight: {
      latestKg,
      priorKg,
      deltaKg,
      recent: weightLogs.map((log) => ({
        date: toLocalDateKey(new Date(log.date)),
        weightKg: log.weight,
      })),
    },
  };
}
