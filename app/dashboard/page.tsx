import { prisma } from "@/lib/prisma";
import { endOfDay, getDaysAgo, startOfDay, toLocalDateKey } from "@/lib/date";
import { mealLoggingStreakEndingYesterday, mealLoggingStreakFromDayKeys } from "@/lib/meal-logging-streak";
import { buildHealthInsights } from "@/lib/dashboard-insights";
import { buildDashboardTimeline, countChestWorkouts } from "@/lib/dashboard-timeline";
import { buildLegacyGamificationSummary } from "@/lib/gamification-legacy";
import { buildPersonalRecords } from "@/lib/personal-records";
import {
  buildTodayWorkoutPlan,
  countWeeklyWorkouts,
  estimateCaloriesBurnedToday,
} from "@/lib/today-workout-plan";
import { redirect } from "next/navigation";
import { requireUserIdForPage } from "@/lib/auth";
import { buildLoggableTemplates, mealSlotFromHour } from "@/lib/meal-templates";
import { SectionHeader } from "@/components/SectionHeader";
import { RankBadge } from "@/components/dashboard/RankBadge";
import { DashboardHomeClient } from "@/components/dashboard/DashboardHomeClient";
import type { FoodItemType, MealTemplateType, WeightLogType } from "@/types";
import type { DashboardPayload } from "@/types/dashboard";

const WEEKLY_WORKOUT_TARGET = 4;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const userId = await requireUserIdForPage();
  const sp = await searchParams;
  const today = new Date();
  const dayStart = startOfDay(today);
  const todayKey = toLocalDateKey(today);
  const weekStart = getDaysAgo(6);
  const monthStart = getDaysAgo(29);
  const prevMonthStart = getDaysAgo(59);
  const prevMonthEnd = getDaysAgo(30);
  const since90 = getDaysAgo(90);

  const [
    meals,
    goals,
    hydrationToday,
    streakMeals,
    weightLogs7d,
    todayWorkout,
    recentCompletedWorkouts,
    weekWorkouts,
    workouts90,
    workouts60,
    allWorkoutsWithExercises,
    recentMealsT,
    recentWorkoutsT,
    recentWeightsT,
    meals7d,
    monthMeals,
    foods,
    mealTemplates,
  ] = await Promise.all([
    prisma.mealEntry.findMany({ where: { userId, date: { gte: dayStart, lte: endOfDay(today) } } }),
    prisma.goalSetting.findUnique({ where: { userId } }),
    prisma.hydrationLog.findUnique({ where: { userId_date: { userId, date: dayStart } } }),
    prisma.mealEntry.findMany({
      where: { userId, date: { gte: getDaysAgo(400) } },
      select: { date: true },
    }),
    prisma.weightLog.findMany({
      where: { userId, date: { gte: getDaysAgo(6) } },
      orderBy: { date: "asc" },
      select: { id: true, weight: true, date: true, waistCm: true },
    }),
    prisma.workout.findFirst({
      where: { userId, date: { gte: dayStart, lte: endOfDay(today) } },
      include: { exercises: true },
    }),
    prisma.workout.findMany({
      where: { userId, completed: true },
      orderBy: { date: "desc" },
      take: 8,
      select: { date: true },
    }),
    prisma.workout.findMany({
      where: { userId, completed: true, date: { gte: weekStart, lte: endOfDay(today) } },
      select: { date: true },
    }),
    prisma.workout.findMany({
      where: { userId, completed: true, date: { gte: since90 } },
      select: { date: true },
    }),
    prisma.workout.findMany({
      where: { userId, completed: true, date: { gte: prevMonthStart } },
      include: { exercises: { select: { name: true } } },
    }),
    prisma.workout.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 40,
      include: { exercises: true },
    }),
    prisma.mealEntry.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, mealType: true, totalCalories: true, createdAt: true },
    }),
    prisma.workout.findMany({
      where: { userId, completed: true },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: { id: true, date: true, updatedAt: true },
    }),
    prisma.weightLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, weight: true, date: true, createdAt: true },
    }),
    prisma.mealEntry.findMany({
      where: { userId, date: { gte: weekStart, lte: endOfDay(today) } },
      select: { date: true, totalCalories: true },
    }),
    prisma.mealEntry.findMany({
      where: { userId, date: { gte: monthStart } },
      select: { totalCalories: true },
    }),
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
  ]);

  if (!goals) redirect("/onboarding");

  const targets = {
    calories: goals.calorieTarget,
    protein: goals.proteinTarget,
    carbs: goals.carbTarget,
    fat: goals.fatTarget,
  };

  const totals = {
    calories: meals.reduce((s, m) => s + m.totalCalories, 0),
    protein: meals.reduce((s, m) => s + m.totalProtein, 0),
    carbs: meals.reduce((s, m) => s + (m.totalCarbs ?? 0), 0),
    fat: meals.reduce((s, m) => s + (m.totalFat ?? 0), 0),
  };

  const streakLoggedDays = new Set(streakMeals.map((m) => toLocalDateKey(new Date(m.date))));
  const mealsLoggedToday = meals.length > 0;
  const streakEndingYesterday = mealLoggingStreakEndingYesterday(streakLoggedDays);
  const streak = mealsLoggedToday ? mealLoggingStreakFromDayKeys(streakLoggedDays) : streakEndingYesterday;
  const streakAfterFirstLogToday = streakEndingYesterday + 1;
  const weightLoggedToday = weightLogs7d.some((l) => toLocalDateKey(new Date(l.date)) === todayKey);
  const weightLogsForHome: WeightLogType[] = weightLogs7d.map((l) => ({
    id: l.id,
    date: l.date.toISOString(),
    weight: l.weight,
    waistCm: l.waistCm,
  }));

  const waterMl = hydrationToday?.totalMl ?? 0;
  const waterGoalMl = goals.waterTargetMl ?? 2000;
  const waterPct = Math.min(100, Math.round((waterMl / waterGoalMl) * 100));

  const todayWorkoutPlan = buildTodayWorkoutPlan({
    todayWorkout: todayWorkout
      ? {
          id: todayWorkout.id,
          completed: todayWorkout.completed,
          caloriesBurned: todayWorkout.caloriesBurned,
          exercises: todayWorkout.exercises.map((e) => ({
            name: e.name,
            sets: e.sets,
            reps: e.reps,
            weight: e.weight,
          })),
        }
      : null,
    recentCompletedWorkoutDates: recentCompletedWorkouts.map((w) => toLocalDateKey(new Date(w.date))),
  });

  const caloriesBurnedToday = estimateCaloriesBurnedToday(
    todayWorkout
      ? {
          completed: todayWorkout.completed,
          caloriesBurned: todayWorkout.caloriesBurned,
          exercises: todayWorkout.exercises.map((e) => ({
            name: e.name,
            sets: e.sets,
            reps: e.reps,
            weight: e.weight,
          })),
        }
      : null,
  );

  const weeklyWorkoutsCompleted = countWeeklyWorkouts(
    weekWorkouts.map((w) => new Date(w.date)),
    weekStart,
    endOfDay(today),
  );

  const mealDays = new Set(streakMeals.map((m) => toLocalDateKey(new Date(m.date))));
  const workoutDays = new Set(workouts90.map((w) => toLocalDateKey(new Date(w.date))));
  const weightDays = new Set(weightLogs7d.map((l) => toLocalDateKey(new Date(l.date))));
  const hydrationDays = waterMl > 0 ? new Set([todayKey]) : new Set<string>();

  const adherence = monthMeals.length
    ? Math.round((monthMeals.filter((m) => m.totalCalories <= targets.calories).length / monthMeals.length) * 100)
    : 0;

  const gamification = buildLegacyGamificationSummary({
    mealDays,
    workoutDays,
    weightDays,
    hydrationDays,
    adherence,
    hydrationGoalHitToday: waterMl >= waterGoalMl,
  });

  const xpEarnedToday = gamification.quests.filter((q) => q.completed).reduce((s, q) => s + q.rewardXp, 0);
  const personalRecords = buildPersonalRecords(
    allWorkoutsWithExercises.map((w) => ({
      date: w.date.toISOString(),
      exercises: w.exercises.map((e) => ({
        name: e.name,
        sets: e.sets,
        reps: e.reps,
        weight: e.weight,
      })),
    })),
  );

  const timeline = buildDashboardTimeline(recentMealsT, recentWorkoutsT, recentWeightsT, {
    xpEarnedToday,
    badges: gamification.badges,
    personalRecords,
    limit: 6,
  });

  const weightTrend7d =
    weightLogsForHome.length > 1 ? weightLogsForHome[weightLogsForHome.length - 1].weight - weightLogsForHome[0].weight : null;

  const waistLogs = weightLogsForHome.filter((l) => l.waistCm != null);
  const waistTrend7d = waistLogs.length > 1 ? waistLogs[waistLogs.length - 1].waistCm! - waistLogs[0].waistCm! : null;

  const weekMealDays = new Set(meals7d.map((m) => toLocalDateKey(new Date(m.date)))).size;
  const caloriesConsumedWeekAvg = weekMealDays
    ? Math.round(meals7d.reduce((s, m) => s + m.totalCalories, 0) / weekMealDays)
    : totals.calories;

  const chestThisMonth = countChestWorkouts(
    workouts60.filter((w) => w.date >= monthStart),
    monthStart,
    endOfDay(today),
  );
  const chestLastMonth = countChestWorkouts(
    workouts60.filter((w) => w.date >= prevMonthStart && w.date < prevMonthEnd),
    prevMonthStart,
    prevMonthEnd,
  );

  const insights = buildHealthInsights({
    calorieTarget: targets.calories,
    caloriesConsumed: totals.calories,
    caloriesConsumedWeekAvg,
    weightTrend7d,
    waistTrend7d,
    chestWorkoutsThisMonth: chestThisMonth,
    chestWorkoutsLastMonth: chestLastMonth,
    weeklyWorkoutsCompleted,
    weeklyWorkoutTarget: WEEKLY_WORKOUT_TARGET,
    hydrationPct: waterPct,
    workoutCompletedToday: todayWorkout?.completed ?? false,
    questsCompleted: gamification.dailyQuestsCompleted,
    questsTotal: gamification.quests.length,
  });

  const logTemplates = buildLoggableTemplates(
    targets,
    mealTemplates as unknown as MealTemplateType[],
    foods as unknown as FoodItemType[],
  );

  const payload: DashboardPayload = {
    dateLabel: today.toLocaleDateString("en", { weekday: "long", day: "numeric", month: "short" }),
    dateKey: todayKey,
    targets,
    totals,
    streak,
    streakAfterFirstLogToday,
    mealsLoggedToday,
    waterGoalMl,
    initialWaterMl: waterMl,
    weightLogs: weightLogsForHome,
    weightLoggedToday,
    todayWorkout: todayWorkoutPlan,
    caloriesBurnedToday,
    weeklyWorkoutsCompleted,
    weeklyWorkoutTarget: WEEKLY_WORKOUT_TARGET,
    gamification: {
      globalStreak: gamification.globalStreak,
      mealStreak: gamification.mealStreak,
      workoutStreak: gamification.workoutStreak,
      badges: gamification.badges,
      level: gamification.level,
      rank: gamification.rank,
      weeklyGoalProgress: gamification.weeklyGoalProgress,
      weeklyGoalTarget: gamification.weeklyGoalTarget,
      xpEarnedToday,
    },
    timeline,
    insights,
    personalRecords,
    mealTemplates: logTemplates,
    initialMealSlot: mealSlotFromHour(today.getHours()),
    showWelcome: sp.welcome === "1",
  };

  const subtitle =
    todayWorkoutPlan.status === "completed"
      ? "Workout done — keep fueling and recovering."
      : todayWorkoutPlan.status === "in_progress"
        ? "Session in progress. Finish strong."
        : streak > 0
          ? `${streak}-day streak active — start today's plan.`
          : "Your fitness command center for today.";

  return (
    <div className="flex min-h-[calc(100dvh-var(--app-header-h)-var(--app-bottom-nav-h)-1.25rem)] flex-col pb-1">
      <SectionHeader
        className="mb-3"
        eyebrow={payload.dateLabel}
        title="Today"
        subtitle={subtitle}
        action={<RankBadge level={payload.gamification.level} rank={payload.gamification.rank} />}
      />

      <DashboardHomeClient payload={payload} />
    </div>
  );
}
