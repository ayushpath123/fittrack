import { endOfDay, getDaysAgo, startOfDay, toLocalDateKey } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { summarizeWorkoutLogs } from "@/lib/domain/workout-logs";
import type { WorkoutAchievement, WorkoutAnalyticsSnapshot } from "@/types/workout";
import { workoutTypeLabel, type WorkoutTypeKind } from "@/types/workout";

function computeStreak(dayKeys: Set<string>): { current: number; longest: number } {
  const sorted = [...dayKeys].sort().reverse();
  if (!sorted.length) return { current: 0, longest: 0 };

  const today = toLocalDateKey(new Date());
  let current = 0;
  let cursor = today;
  while (dayKeys.has(cursor)) {
    current++;
    const d = new Date(cursor);
    d.setDate(d.getDate() - 1);
    cursor = toLocalDateKey(d);
  }

  let longest = 0;
  let run = 0;
  const asc = [...dayKeys].sort();
  for (let i = 0; i < asc.length; i++) {
    if (i === 0) {
      run = 1;
    } else {
      const prev = new Date(asc[i - 1]);
      const curr = new Date(asc[i]);
      const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      run = diff === 1 ? run + 1 : 1;
    }
    longest = Math.max(longest, run);
  }

  return { current, longest };
}

function buildAchievements(args: {
  totalWorkouts: number;
  totalCalories: number;
  currentStreak: number;
  longestStreak: number;
}): WorkoutAchievement[] {
  return [
    { id: "first_workout", label: "First Workout", emoji: "🏅", unlocked: args.totalWorkouts >= 1 },
    { id: "streak_7", label: "7-Day Streak", emoji: "🏅", unlocked: args.longestStreak >= 7 },
    { id: "streak_30", label: "30-Day Streak", emoji: "🏅", unlocked: args.longestStreak >= 30 },
    { id: "workouts_100", label: "100 Workouts Logged", emoji: "🏅", unlocked: args.totalWorkouts >= 100 },
    { id: "calories_10k", label: "10,000 Calories Burned", emoji: "🏅", unlocked: args.totalCalories >= 10_000 },
    { id: "streak_current_7", label: "On a Roll", emoji: "🔥", unlocked: args.currentStreak >= 7 },
  ];
}

export async function getWorkoutAnalytics(userId: string): Promise<WorkoutAnalyticsSnapshot> {
  const today = new Date();
  const weekStart = getDaysAgo(6);
  const monthStart = getDaysAgo(29);

  const [weekRows, monthRows, allRows, totalCount, totalCaloriesAgg] = await Promise.all([
    prisma.workoutLog.findMany({
      where: { userId, workoutDate: { gte: startOfDay(weekStart), lte: endOfDay(today) } },
      select: { duration: true, caloriesBurned: true, workoutDate: true, workoutType: true },
    }),
    prisma.workoutLog.findMany({
      where: { userId, workoutDate: { gte: startOfDay(monthStart), lte: endOfDay(today) } },
      select: { duration: true, caloriesBurned: true, workoutDate: true, workoutType: true },
    }),
    prisma.workoutLog.findMany({
      where: { userId, workoutDate: { gte: getDaysAgo(400) } },
      select: { workoutDate: true },
    }),
    prisma.workoutLog.count({ where: { userId } }),
    prisma.workoutLog.aggregate({ where: { userId }, _sum: { caloriesBurned: true } }),
  ]);

  const weekSummary = summarizeWorkoutLogs(weekRows);
  const monthSummary = summarizeWorkoutLogs(monthRows);
  const weekDays = new Set(weekRows.map((r) => toLocalDateKey(new Date(r.workoutDate)))).size;

  const muscleCounts = new Map<string, number>();
  for (const row of monthRows) {
    const label = workoutTypeLabel(row.workoutType as WorkoutTypeKind);
    muscleCounts.set(label, (muscleCounts.get(label) ?? 0) + 1);
  }
  let mostTrained: string | null = null;
  let maxCount = 0;
  for (const [label, count] of muscleCounts) {
    if (count > maxCount) {
      maxCount = count;
      mostTrained = label;
    }
  }

  const allDayKeys = new Set(allRows.map((r) => toLocalDateKey(new Date(r.workoutDate))));
  const streak = computeStreak(allDayKeys);
  const totalCalories = totalCaloriesAgg._sum.caloriesBurned ?? 0;

  return {
    weekly: { ...weekSummary, activeDays: weekDays },
    monthly: {
      ...monthSummary,
      mostTrainedMuscleGroup: mostTrained,
      avgDurationMin: monthRows.length ? Math.round(monthSummary.totalDurationMin / monthRows.length) : 0,
    },
    streak: {
      current: streak.current,
      longest: streak.longest,
      weeklyCompletionRate: Math.round((weekDays / 7) * 100),
    },
    totalWorkoutsLogged: totalCount,
    totalCaloriesAllTime: totalCalories,
    achievements: buildAchievements({
      totalWorkouts: totalCount,
      totalCalories,
      currentStreak: streak.current,
      longestStreak: streak.longest,
    }),
  };
}
