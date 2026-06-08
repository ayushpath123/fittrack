import { toLocalDateKey } from "@/lib/date";

export type MealCaloriesPoint = {
  dateKey: string;
  label: string;
  calories: number;
};

export function buildMealCaloriesSeries(
  rows: { date: Date | string; totalCalories: number }[],
  endDate: Date = new Date(),
  days = 7,
): MealCaloriesPoint[] {
  const byDay = new Map<string, number>();
  for (const row of rows) {
    const key = toLocalDateKey(new Date(row.date));
    byDay.set(key, (byDay.get(key) ?? 0) + row.totalCalories);
  }

  const out: MealCaloriesPoint[] = [];
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
