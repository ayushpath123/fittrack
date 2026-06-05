import type { HealthInsight } from "@/types/dashboard";

export function buildHealthInsights(args: {
  calorieTarget: number;
  caloriesConsumed: number;
  caloriesConsumedWeekAvg: number;
  weightTrend7d: number | null;
  waistTrend7d: number | null;
  chestWorkoutsThisMonth: number;
  chestWorkoutsLastMonth: number;
  weeklyWorkoutsCompleted: number;
  weeklyWorkoutTarget: number;
  hydrationPct: number;
  workoutCompletedToday: boolean;
  questsCompleted: number;
  questsTotal: number;
}): HealthInsight[] {
  const insights: HealthInsight[] = [];
  const {
    calorieTarget,
    caloriesConsumed,
    caloriesConsumedWeekAvg,
    weightTrend7d,
    waistTrend7d,
    chestWorkoutsThisMonth,
    chestWorkoutsLastMonth,
    weeklyWorkoutsCompleted,
    weeklyWorkoutTarget,
    hydrationPct,
    workoutCompletedToday,
    questsCompleted,
    questsTotal,
  } = args;

  const weekCalorieDelta = caloriesConsumedWeekAvg - calorieTarget;
  if (weekCalorieDelta <= -80) {
    insights.push({
      id: "cal-ahead",
      message: "You're ahead of calorie goals this week — great discipline.",
      tone: "positive",
    });
  } else if (weekCalorieDelta >= 120) {
    insights.push({
      id: "cal-over",
      message: "Weekly intake is running high. Tighten portions for the next few days.",
      tone: "warning",
    });
  }

  if (chestWorkoutsLastMonth > 0) {
    const pctChange = Math.round(((chestWorkoutsThisMonth - chestWorkoutsLastMonth) / chestWorkoutsLastMonth) * 100);
    if (pctChange >= 15) {
      insights.push({
        id: "chest-up",
        message: `Chest workouts increased ${pctChange}% this month.`,
        tone: "positive",
      });
    }
  }

  if (weightTrend7d !== null && weightTrend7d < -0.2) {
    insights.push({
      id: "weight-down",
      message: "Weight trend is improving over the last 7 days.",
      tone: "positive",
    });
  } else if (weightTrend7d !== null && weightTrend7d > 0.4) {
    insights.push({
      id: "weight-up",
      message: "Weight ticked up this week — review intake and recovery.",
      tone: "warning",
    });
  }

  if (waistTrend7d !== null && waistTrend7d < -0.5) {
    insights.push({
      id: "waist-down",
      message: "Waist measurement is trending down — body composition improving.",
      tone: "positive",
    });
  }

  const recoveryScore = Math.round((hydrationPct + (workoutCompletedToday ? 40 : 10) + (questsCompleted / Math.max(1, questsTotal)) * 30) / 1.2);
  if (recoveryScore < 45) {
    insights.push({
      id: "recovery-low",
      message: "Recovery score is low — prioritize sleep, hydration, and rest.",
      tone: "warning",
    });
  } else if (recoveryScore >= 75) {
    insights.push({
      id: "recovery-high",
      message: "Recovery looks strong — good day to push training intensity.",
      tone: "positive",
    });
  }

  if (weeklyWorkoutsCompleted >= weeklyWorkoutTarget) {
    insights.push({
      id: "weekly-goal",
      message: `Weekly workout goal hit (${weeklyWorkoutsCompleted}/${weeklyWorkoutTarget}).`,
      tone: "positive",
    });
  } else if (weeklyWorkoutsCompleted === weeklyWorkoutTarget - 1) {
    insights.push({
      id: "weekly-close",
      message: "One more session this week to hit your training target.",
      tone: "neutral",
    });
  }

  if (!insights.length) {
    insights.push({
      id: "default",
      message: "Log meals and workouts today to unlock personalized insights.",
      tone: "neutral",
    });
  }

  return insights.slice(0, 4);
}
