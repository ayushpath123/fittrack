"use client";

import { Check, Clock, Flame } from "lucide-react";
import { groupHistoryByDate } from "@/lib/workout-recommendations";
import type { WorkoutLogType } from "@/types/workout";
import { toLocalDateKey } from "@/lib/date";

type WorkoutHistoryListProps = {
  logs: WorkoutLogType[];
  limit?: number;
};

function formatDateLabel(dateKey: string): string {
  const today = toLocalDateKey(new Date());
  const yesterday = toLocalDateKey(new Date(Date.now() - 86400000));
  if (dateKey === today) return "Today";
  if (dateKey === yesterday) return "Yesterday";
  const d = new Date(dateKey);
  return d.toLocaleDateString("en", { month: "short", day: "numeric" });
}

export function WorkoutHistoryList({ logs, limit = 30 }: WorkoutHistoryListProps) {
  const grouped = groupHistoryByDate(logs.slice(0, limit));
  const dates = [...grouped.keys()].sort().reverse();

  if (!dates.length) {
    return (
      <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-6 text-center text-sm text-[var(--muted)]">
        No workout history yet. Quick-log a template to get started.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {dates.map((dateKey) => {
        const dayLogs = grouped.get(dateKey) ?? [];
        const totalCalories = dayLogs.reduce((s, l) => s + l.caloriesBurned, 0);
        return (
          <div key={dateKey}>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-[var(--white)]">{formatDateLabel(dateKey)}</p>
              <p className="text-[10px] text-[var(--muted)]">Total {totalCalories} kcal</p>
            </div>
            <div className="space-y-2">
              {dayLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[rgba(190,255,71,.12)] text-[#B8E86A]">
                    <Check size={14} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--white)]">{log.workoutName}</p>
                    <div className="flex gap-3 text-[10px] text-[var(--muted)]">
                      <span className="inline-flex items-center gap-1">
                        <Flame size={10} aria-hidden />
                        {log.caloriesBurned} kcal
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock size={10} aria-hidden />
                        {log.duration} min
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
