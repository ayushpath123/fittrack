import { getDaysAgo, toLocalDateKey } from "@/lib/date";

/** Consecutive local days (from today backward) with at least one meal logged. */
export function mealLoggingStreakFromDayKeys(loggedDays: Set<string>): number {
  let streak = 0;
  for (let i = 0; ; i++) {
    const d = toLocalDateKey(getDaysAgo(i));
    if (loggedDays.has(d)) streak++;
    else break;
  }
  return streak;
}
