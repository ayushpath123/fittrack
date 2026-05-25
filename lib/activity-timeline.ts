import { toLocalDateKey } from "@/lib/date";
import { formatRelativeTimeShort } from "@/lib/dashboard-relative-time";

export type ActivityFeedItemKind = "meal" | "workout" | "weight" | "xp" | "hydration";

export type ActivityFeedItem = {
  id: string;
  kind: ActivityFeedItemKind;
  title: string;
  meta: string;
  timeLabel: string;
  href: string;
};

type MealRow = { id: string; mealType: string; totalCalories: number; createdAt: Date };
type WorkoutRow = { id: string; date: Date; updatedAt: Date };
type WeightRow = { id: string; weight: number; createdAt: Date };

export function buildActivityFeed(
  recentMeals: MealRow[],
  recentWorkouts: WorkoutRow[],
  recentWeights: WeightRow[],
  opts: { xpEarnedToday: number; limit?: number },
): ActivityFeedItem[] {
  const limit = opts.limit ?? 12;
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

  timelineRaw.sort((a, b) => b.t - a.t);
  const seen = new Set<string>();
  const timeline: ActivityFeedItem[] = [];
  for (const row of timelineRaw) {
    if (seen.has(row.item.id)) continue;
    seen.add(row.item.id);
    timeline.push(row.item);
    if (timeline.length >= limit) break;
  }

  if (opts.xpEarnedToday > 0) {
    timeline.unshift({
      id: "xp-today",
      kind: "xp",
      title: "Quest XP banked",
      meta: `+${opts.xpEarnedToday} XP from today’s quests`,
      timeLabel: "Today",
      href: "/game",
    });
    if (timeline.length > limit) timeline.length = limit;
  }

  return timeline;
}
