"use client";

import { Clock, Dumbbell, Flame } from "lucide-react";
import type { WorkoutDaySummary } from "@/types/workout";

type ActivitySummaryWidgetProps = {
  summary: WorkoutDaySummary;
};

export function ActivitySummaryWidget({ summary }: ActivitySummaryWidgetProps) {
  return (
    <section>
      <p className="mb-2 px-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
        Activity Summary
      </p>
      <div className="premium-card grid grid-cols-3 gap-2 rounded-[var(--radius-card)] p-3">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-2 py-2.5 text-center">
          <Dumbbell size={14} className="mx-auto text-[var(--muted)]" aria-hidden />
          <p className="num mt-1 text-lg font-bold text-[var(--white)]">{summary.workoutCount}</p>
          <p className="text-[9px] text-[var(--hint)]">
            {summary.workoutCount === 1 ? "Workout" : "Workouts"}
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-2 py-2.5 text-center">
          <Flame size={14} className="mx-auto text-[#FFB547]" aria-hidden />
          <p className="num mt-1 text-lg font-bold text-[var(--white)]">{summary.totalCaloriesBurned}</p>
          <p className="text-[9px] text-[var(--hint)]">kcal burned</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-2 py-2.5 text-center">
          <Clock size={14} className="mx-auto text-[var(--muted)]" aria-hidden />
          <p className="num mt-1 text-lg font-bold text-[var(--white)]">{summary.totalDurationMin}</p>
          <p className="text-[9px] text-[var(--hint)]">mins</p>
        </div>
      </div>
    </section>
  );
}
