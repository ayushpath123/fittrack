import { toLocalDateKey } from "@/lib/date";

export type WorkoutCaloriesPoint = {
  dateKey: string;
  label: string;
  calories: number;
};

export function buildWorkoutCaloriesSeries(
  rows: { workoutDate: Date | string; caloriesBurned: number }[],
  endDate: Date = new Date(),
  days = 7,
): WorkoutCaloriesPoint[] {
  const byDay = new Map<string, number>();
  for (const row of rows) {
    const key = toLocalDateKey(new Date(row.workoutDate));
    byDay.set(key, (byDay.get(key) ?? 0) + row.caloriesBurned);
  }

  const out: WorkoutCaloriesPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(endDate);
    d.setDate(d.getDate() - i);
    const key = toLocalDateKey(d);
    out.push({
      dateKey: key,
      label: d.toLocaleDateString("en", { weekday: "short" }),
      calories: byDay.get(key) ?? 0,
    });
  }
  return out;
}
