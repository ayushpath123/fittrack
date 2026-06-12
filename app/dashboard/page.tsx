import { prisma } from "@/lib/prisma";
import { endOfDay, getDaysAgo, startOfDay, toLocalDateKey } from "@/lib/date";
import { mealLoggingStreakEndingYesterday, mealLoggingStreakFromDayKeys } from "@/lib/meal-logging-streak";
import { buildHealthInsights } from "@/lib/dashboard-insights";
import { buildDashboardTimeline, countChestWorkouts } from "@/lib/dashboard-timeline";
import {
  getWorkoutSummaryForDate,
  getWorkoutSummaryForWeek,
  listWorkoutLogsForDate,
} from "@/lib/domain/workout-logs";
import { ensureDefaultWorkoutTemplates } from "@/lib/default-workout-templates";
import { suggestWorkoutTemplate } from "@/lib/workout-recommendations";
import { listWorkoutTemplatesForUser } from "@/lib/workout-template-service";
import { buildMealCaloriesSeries } from "@/lib/meal-chart-data";
import { buildLegacyGamificationSummary } from "@/lib/gamification-legacy";
import { countWeeklyWorkoutDays } from "@/lib/workout-summary";
import { workoutTypeLabel } from "@/types/workout";
import { redirect } from "next/navigation";
import { requireUserIdForPage } from "@/lib/auth";
import { withPrismaRetry } from "@/lib/prisma-retry";
import { SectionHeader } from "@/components/SectionHeader";
import { RankBadge } from "@/components/dashboard/RankBadge";
import { DashboardHomeClient } from "@/components/dashboard/DashboardHomeClient";
import { serializeWeightLog } from "@/lib/weight-serialize";
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

  const [[
    meals,
    goals,
    hydrationToday,
    streakMeals,
    weightLogs30d,
    weekWorkoutLogs,
    workouts90,
    workouts60,
    recentMealsT,
    recentWorkoutsT,
    recentWeightsT,
    meals7d,
    monthMeals,
  ]] = await Promise.all([
    withPrismaRetry(() =>
      Promise.all([
      prisma.mealEntry.findMany({ where: { userId, date: { gte: dayStart, lte: endOfDay(today) } } }),
      prisma.goalSetting.findUnique({ where: { userId } }),
      prisma.hydrationLog.findUnique({ where: { userId_date: { userId, date: dayStart } } }),
      prisma.mealEntry.findMany({
        where: { userId, date: { gte: getDaysAgo(400) } },
        select: { date: true },
      }),
      prisma.weightLog.findMany({
        where: { userId, date: { gte: getDaysAgo(29) } },
        orderBy: { date: "asc" },
        select: { id: true, userId: true, weight: true, date: true, waistCm: true, createdAt: true, updatedAt: true },
      }),
      prisma.workoutLog.findMany({
        where: { userId, workoutDate: { gte: weekStart, lte: endOfDay(today) } },
        select: { workoutDate: true, caloriesBurned: true },
      }),
      prisma.workoutLog.findMany({
        where: { userId, workoutDate: { gte: since90 } },
        select: { workoutDate: true },
      }),
      prisma.workoutLog.findMany({
        where: { userId, workoutDate: { gte: prevMonthStart } },
        select: { workoutDate: true, workoutType: true },
      }),
      prisma.mealEntry.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, mealType: true, totalCalories: true, createdAt: true },
      }),
      prisma.workoutLog.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, workoutName: true, duration: true, caloriesBurned: true, createdAt: true },
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
      ]),
    ),
    // Seed built-in templates concurrently; must finish before listWorkoutTemplatesForUser below.
    ensureDefaultWorkoutTemplates(userId),
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
  const weightLogsForHome = [...weightLogs30d].reverse().map(serializeWeightLog);
  const weightLoggedToday = weightLogsForHome.some((l) => toLocalDateKey(new Date(l.date)) === todayKey);

  const waterMl = hydrationToday?.totalMl ?? 0;
  const waterGoalMl = goals.waterTargetMl ?? 2000;
  const waterPct = Math.min(100, Math.round((waterMl / waterGoalMl) * 100));

  const [todayWorkoutLogs, workoutSummaryToday, workoutSummaryWeek, workoutTemplates, workoutHistoryForSuggest] =
    await withPrismaRetry(() =>
      Promise.all([
        listWorkoutLogsForDate(userId, todayKey),
        getWorkoutSummaryForDate(userId, todayKey),
        getWorkoutSummaryForWeek(userId),
        listWorkoutTemplatesForUser(userId),
        prisma.workoutLog.findMany({
          where: { userId },
          orderBy: { workoutDate: "desc" },
          take: 60,
          select: { workoutDate: true, workoutType: true },
        }),
      ]),
    );

  const workoutSuggestion = suggestWorkoutTemplate(workoutTemplates, workoutHistoryForSuggest);
  const caloriesConsumedLast7Days = buildMealCaloriesSeries(meals7d, today);

  const todayWorkoutPlan = {
    title: todayWorkoutLogs.length ? todayWorkoutLogs[0].workoutName : "Log your activity",
    muscleGroups: todayWorkoutLogs.length ? [workoutTypeLabel(todayWorkoutLogs[0].workoutType)] : [],
    durationMin: workoutSummaryToday.totalDurationMin,
    estimatedCalories: workoutSummaryToday.totalCaloriesBurned,
    status: todayWorkoutLogs.length ? ("completed" as const) : ("not_started" as const),
    exerciseCount: todayWorkoutLogs.length,
  };

  const caloriesBurnedToday = workoutSummaryToday.totalCaloriesBurned;

  const weeklyWorkoutsCompleted = countWeeklyWorkoutDays(
    weekWorkoutLogs.map((w) => new Date(w.workoutDate)),
    weekStart,
    endOfDay(today),
  );

  const mealDays = new Set(streakMeals.map((m) => toLocalDateKey(new Date(m.date))));
  const workoutDays = new Set(workouts90.map((w) => toLocalDateKey(new Date(w.workoutDate))));
  const weightDays = new Set(weightLogs30d.map((l) => toLocalDateKey(new Date(l.date))));
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
  const personalRecords: DashboardPayload["personalRecords"] = [];

  let activeDaysLast7 = 0;
  for (let i = 0; i < 7; i++) {
    const key = toLocalDateKey(getDaysAgo(i));
    if (mealDays.has(key) || workoutDays.has(key) || weightDays.has(key)) activeDaysLast7 += 1;
  }
  const weeklyConsistencyPct = Math.round((activeDaysLast7 / 7) * 100);

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
    workouts60.filter((w) => w.workoutDate >= monthStart),
    monthStart,
    endOfDay(today),
  );
  const chestLastMonth = countChestWorkouts(
    workouts60.filter((w) => w.workoutDate >= prevMonthStart && w.workoutDate < prevMonthEnd),
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
    workoutCompletedToday: todayWorkoutLogs.length > 0,
    questsCompleted: gamification.dailyQuestsCompleted,
    questsTotal: gamification.quests.length,
  });

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
    todayWorkoutLogs,
    workoutSummaryToday,
    workoutSummaryWeek,
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
      xp: gamification.xp,
      weeklyConsistencyPct,
      weeklyGoalProgress: gamification.weeklyGoalProgress,
      weeklyGoalTarget: gamification.weeklyGoalTarget,
      xpEarnedToday,
    },
    timeline,
    insights,
    personalRecords,
    workoutTemplates,
    workoutSuggestion,
    caloriesConsumedLast7Days,
    showWelcome: sp.welcome === "1",
  };

  const subtitle = "Your daily fitness snapshot at a glance.";

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
