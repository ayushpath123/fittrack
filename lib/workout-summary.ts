import { toLocalDateKey } from "@/lib/date";

/** Count distinct calendar days with at least one workout log in range. */
export function countWeeklyWorkoutDays(dates: Date[], from: Date, to: Date): number {
  const days = new Set<string>();
  const fromMs = from.getTime();
  const toMs = to.getTime();
  for (const d of dates) {
    const t = d.getTime();
    if (t < fromMs || t > toMs) continue;
    days.add(toLocalDateKey(d));
  }
  return days.size;
}
