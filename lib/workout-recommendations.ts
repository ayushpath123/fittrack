import { toLocalDateKey } from "@/lib/date";
import type { WorkoutSuggestedTemplate, WorkoutTemplateType } from "@/types/workout";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

type HistoryRow = { workoutDate: Date; workoutType: string };

/**
 * Suggests a template based on what the user typically does on this day of week.
 */
export function suggestWorkoutTemplate(
  templates: WorkoutTemplateType[],
  history: HistoryRow[],
): WorkoutSuggestedTemplate | null {
  if (!templates.length) return null;

  const todayDow = new Date().getDay();
  const todayName = DAY_NAMES[todayDow];

  const typeCounts = new Map<string, number>();
  for (const row of history) {
    if (new Date(row.workoutDate).getDay() !== todayDow) continue;
    typeCounts.set(row.workoutType, (typeCounts.get(row.workoutType) ?? 0) + 1);
  }

  let bestType: string | null = null;
  let bestCount = 0;
  for (const [type, count] of typeCounts) {
    if (count > bestCount) {
      bestCount = count;
      bestType = type;
    }
  }

  if (bestType && bestCount >= 2) {
    const match =
      templates.find((t) => t.workoutType === bestType && t.category === "strength") ??
      templates.find((t) => t.workoutType === bestType);
    if (match) {
      return {
        template: match,
        reason: `You usually train ${match.name.replace(" Day", "")} on ${todayName}s`,
      };
    }
  }

  const strengthTemplates = templates.filter((t) => t.category === "strength");
  const rotation = ["chest", "back", "shoulders", "arms", "legs"] as const;
  const recentTypes = new Set(
    history
      .slice(0, 14)
      .map((h) => h.workoutType),
  );

  for (const type of rotation) {
    if (!recentTypes.has(type)) {
      const match = strengthTemplates.find((t) => t.workoutType === type);
      if (match) {
        return { template: match, reason: `${match.name} is up next in your split` };
      }
    }
  }

  const mostUsed = [...templates].sort((a, b) => (b.useCount ?? 0) - (a.useCount ?? 0))[0];
  if (mostUsed && (mostUsed.useCount ?? 0) > 0) {
    return { template: mostUsed, reason: "Your most-used template" };
  }

  const defaultSplit = strengthTemplates.find((t) => t.builtinKey === "chest_day") ?? strengthTemplates[0];
  if (defaultSplit) {
    return { template: defaultSplit, reason: `Suggested for ${todayName}` };
  }

  return null;
}

export function groupHistoryByDate<T extends { workoutDate: string | Date }>(
  logs: T[],
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const log of logs) {
    const key = toLocalDateKey(new Date(log.workoutDate));
    const group = map.get(key) ?? [];
    group.push(log);
    map.set(key, group);
  }
  return map;
}
