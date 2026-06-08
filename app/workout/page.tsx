import { Suspense } from "react";
import { WorkoutClient } from "./WorkoutClient";
import { requireUserIdForPage } from "@/lib/auth";
import { endOfDay, getDaysAgo } from "@/lib/date";
import {
  getWorkoutSummaryForDate,
  getWorkoutSummaryForWeek,
  listWorkoutLogsForDate,
} from "@/lib/domain/workout-logs";
import { ensureDefaultWorkoutTemplates } from "@/lib/default-workout-templates";
import { listWorkoutTemplatesForUser } from "@/lib/workout-template-service";
import { buildWorkoutCaloriesSeries } from "@/lib/workout-chart-data";
import { prisma } from "@/lib/prisma";

export default async function WorkoutPage() {
  const userId = await requireUserIdForPage();
  await ensureDefaultWorkoutTemplates(userId);

  const today = new Date();
  const weekStart = getDaysAgo(6);

  const [todayLogs, templates, todaySummary, weekSummary, weekWorkoutLogs] = await Promise.all([
    listWorkoutLogsForDate(userId),
    listWorkoutTemplatesForUser(userId),
    getWorkoutSummaryForDate(userId),
    getWorkoutSummaryForWeek(userId),
    prisma.workoutLog.findMany({
      where: { userId, workoutDate: { gte: weekStart, lte: endOfDay(today) } },
      select: { workoutDate: true, caloriesBurned: true },
    }),
  ]);

  const caloriesSeries = buildWorkoutCaloriesSeries(weekWorkoutLogs, today);

  return (
    <Suspense fallback={<div className="py-8 text-sm text-[var(--muted)]">Loading workouts…</div>}>
      <WorkoutClient
        todayLogs={todayLogs}
        templates={templates}
        todaySummary={todaySummary}
        weekSummary={weekSummary}
        caloriesSeries={caloriesSeries}
      />
    </Suspense>
  );
}
