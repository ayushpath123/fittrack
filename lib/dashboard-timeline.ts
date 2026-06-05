import { formatRelativeTimeShort } from "@/lib/dashboard-relative-time";
import type { ActivityFeedItem } from "@/lib/activity-timeline";
import type { PersonalRecord } from "@/types/dashboard";

type MealRow = { id: string; mealType: string; totalCalories: number; createdAt: Date };
type WorkoutRow = {
  id: string;
  workoutName: string;
  duration: number;
  caloriesBurned: number;
  createdAt: Date;
};
type WeightRow = { id: string; weight: number; createdAt: Date };

export function buildDashboardTimeline(
  recentMeals: MealRow[],
  recentWorkouts: WorkoutRow[],
  recentWeights: WeightRow[],
  opts: {
    xpEarnedToday: number;
    badges: string[];
    personalRecords: PersonalRecord[];
    limit?: number;
  },
): ActivityFeedItem[] {
  const timelineRaw: { t: number; item: ActivityFeedItem }[] = [];

  for (const m of recentMeals) {
    timelineRaw.push({
      t: new Date(m.createdAt).getTime(),
      item: {
        id: `meal-${m.id}`,
        kind: "meal",
        title: `${m.mealType} logged`,
        meta: `${Math.round(m.totalCalories)} kcal`,
        timeLabel: formatRelativeTimeShort(m.createdAt.toISOString()),
        href: "/meals",
      },
    });
  }
  for (const w of recentWorkouts) {
    timelineRaw.push({
      t: new Date(w.createdAt).getTime(),
      item: {
        id: `wo-${w.id}`,
        kind: "workout",
        title: w.workoutName,
        meta: `${w.duration} min · ${w.caloriesBurned} kcal`,
        timeLabel: formatRelativeTimeShort(w.createdAt.toISOString()),
        href: "/workout",
      },
    });
  }
  for (const wl of recentWeights) {
    timelineRaw.push({
      t: new Date(wl.createdAt).getTime(),
      item: {
        id: `wt-${wl.id}`,
        kind: "weight",
        title: "Weight updated",
        meta: `${wl.weight} kg`,
        timeLabel: formatRelativeTimeShort(wl.createdAt.toISOString()),
        href: "/weight",
      },
    });
  }

  if (opts.xpEarnedToday > 0) {
    timelineRaw.push({
      t: Date.now(),
      item: {
        id: "xp-today",
        kind: "xp",
        title: "Quest XP banked",
        meta: `+${opts.xpEarnedToday} XP from today's quests`,
        timeLabel: "Today",
        href: "/game",
      },
    });
  }

  for (const badge of opts.badges.slice(0, 2)) {
    timelineRaw.push({
      t: Date.now() - 3_600_000,
      item: {
        id: `badge-${badge}`,
        kind: "xp",
        title: "Achievement unlocked",
        meta: badge,
        timeLabel: "Recent",
        href: "/game",
      },
    });
  }

  for (const pr of opts.personalRecords.slice(0, 2)) {
    const prTime = new Date(`${pr.date}T12:00:00`).getTime();
    timelineRaw.push({
      t: prTime,
      item: {
        id: `pr-${pr.exercise}`,
        kind: "workout",
        title: `PR: ${pr.exercise}`,
        meta: `${pr.weight} kg × ${pr.reps} reps`,
        timeLabel: formatRelativeTimeShort(new Date(prTime).toISOString()),
        href: "/workout",
      },
    });
  }

  timelineRaw.sort((a, b) => b.t - a.t);

  const seen = new Set<string>();
  const timeline: ActivityFeedItem[] = [];
  for (const row of timelineRaw) {
    if (seen.has(row.item.id)) continue;
    seen.add(row.item.id);
    timeline.push(row.item);
    if (timeline.length >= (opts.limit ?? 8)) break;
  }

  return timeline;
}

export function countChestWorkouts(workouts: { workoutDate: Date; workoutType: string }[], from: Date, to: Date): number {
  let count = 0;
  for (const w of workouts) {
    const t = w.workoutDate.getTime();
    if (t < from.getTime() || t > to.getTime()) continue;
    if (w.workoutType === "chest") count += 1;
  }
  return count;
}
