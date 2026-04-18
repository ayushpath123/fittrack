import { toLocalDateKey } from "@/lib/date";
import type { ExerciseEntryType } from "@/types";

/** Most recent logged set per exercise name, excluding the given calendar day (e.g. today). */
export function buildExerciseLastHints(
  recentWorkouts: { date: string; exercises: ExerciseEntryType[] }[],
  excludeDateKey: string,
): Record<string, ExerciseEntryType> {
  const out: Record<string, ExerciseEntryType> = {};
  for (const w of recentWorkouts) {
    const key = toLocalDateKey(new Date(w.date));
    if (key === excludeDateKey) continue;
    for (const ex of w.exercises) {
      const name = ex.name.trim();
      if (!name || out[name]) continue;
      out[name] = { name, sets: ex.sets, reps: ex.reps, weight: ex.weight };
    }
  }
  return out;
}
