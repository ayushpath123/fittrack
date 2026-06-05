import { formatRelativeTimeShort } from "@/lib/dashboard-relative-time";
import { toLocalDateKey } from "@/lib/date";
import type { ActivityFeedItem } from "@/lib/activity-timeline";
import type { PersonalRecord } from "@/types/dashboard";

type MealRow = { id: string; mealType: string; totalCalories: number; createdAt: Date };
type WorkoutRow = { id: string; date: Date; updatedAt: Date };
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
      t: new Date(w.updatedAt).getTime(),
      item: {
        id: `wo-${w.id}`,
        kind: "workout",
        title: "Workout completed",
        meta: `Session · ${toLocalDateKey(new Date(w.date))}`,
        timeLabel: formatRelativeTimeShort(w.updatedAt.toISOString()),
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

export function countChestWorkouts(workouts: { date: Date; exercises: { name: string }[] }[], from: Date, to: Date): number {
  let count = 0;
  for (const w of workouts) {
    const t = w.date.getTime();
    if (t < from.getTime() || t > to.getTime()) continue;
    const hasChest = w.exercises.some((ex) => {
      const n = ex.name.toLowerCase();
      return n.includes("bench") || n.includes("chest") || n.includes("push");
    });
    if (hasChest) count += 1;
  }
  return count;
}
