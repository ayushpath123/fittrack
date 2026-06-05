import { WorkoutClient } from "./WorkoutClient";
import { requireUserIdForPage } from "@/lib/auth";
import {
  getWorkoutSummaryForDate,
  getWorkoutSummaryForWeek,
  listWorkoutLogHistory,
  listWorkoutLogsForDate,
  listWorkoutTemplates,
} from "@/lib/domain/workout-logs";
import { ensureDefaultWorkoutTemplates } from "@/lib/default-workout-templates";

export default async function WorkoutPage() {
  const userId = await requireUserIdForPage();
  await ensureDefaultWorkoutTemplates(userId);

  const [todayLogs, historyLogs, templates, todaySummary, weekSummary] = await Promise.all([
    listWorkoutLogsForDate(userId),
    listWorkoutLogHistory(userId, 30),
    listWorkoutTemplates(userId),
    getWorkoutSummaryForDate(userId),
    getWorkoutSummaryForWeek(userId),
  ]);

  return (
    <WorkoutClient
      todayLogs={todayLogs}
      historyLogs={historyLogs}
      templates={templates}
      todaySummary={todaySummary}
      weekSummary={weekSummary}
    />
  );
}
