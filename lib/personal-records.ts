import { toLocalDateKey } from "@/lib/date";
import type { ExerciseEntryType } from "@/types";
import type { PersonalRecord } from "@/types/dashboard";

type WorkoutRow = {
  date: string | Date;
  exercises: ExerciseEntryType[];
};

export function buildPersonalRecords(workouts: WorkoutRow[], limit = 4): PersonalRecord[] {
  const best = new Map<string, PersonalRecord>();

  for (const workout of workouts) {
    const dateKey = typeof workout.date === "string" ? toLocalDateKey(new Date(workout.date)) : toLocalDateKey(workout.date);
    for (const ex of workout.exercises) {
      const name = ex.name.trim();
      if (!name) continue;
      const score = ex.weight * ex.reps;
      const prev = best.get(name);
      if (!prev || score > prev.weight * prev.reps) {
        best.set(name, { exercise: name, weight: ex.weight, reps: ex.reps, date: dateKey });
      }
    }
  }

  return [...best.values()]
    .sort((a, b) => b.weight * b.reps - a.weight * a.reps)
    .slice(0, limit);
}
