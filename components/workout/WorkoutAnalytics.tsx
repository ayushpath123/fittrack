"use client";

import { Clock, Dumbbell, Flame } from "lucide-react";
import type { WorkoutDaySummary } from "@/types/workout";

type WorkoutAnalyticsProps = {
  today: WorkoutDaySummary;
  week: WorkoutDaySummary;
};

function StatBlock({ label, value, unit, icon: Icon }: { label: string; value: number | string; unit: string; icon: typeof Flame }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-center">
      <Icon size={14} className="mx-auto text-[var(--muted)]" aria-hidden />
      <p className="num mt-1 text-lg font-bold text-[var(--white)]">{value}</p>
      <p className="text-[9px] text-[var(--hint)]">{unit}</p>
      <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-widest text-[var(--muted)]">{label}</p>
    </div>
  );
}

export function WorkoutAnalytics({ today, week }: WorkoutAnalyticsProps) {
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Today</p>
        <div className="grid grid-cols-3 gap-2">
          <StatBlock label="Workouts" value={today.workoutCount} unit="completed" icon={Dumbbell} />
          <StatBlock label="Burned" value={today.totalCaloriesBurned} unit="kcal" icon={Flame} />
          <StatBlock label="Time" value={today.totalDurationMin} unit="mins" icon={Clock} />
        </div>
      </div>
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">This Week</p>
        <div className="grid grid-cols-3 gap-2">
          <StatBlock label="Workouts" value={week.workoutCount} unit="sessions" icon={Dumbbell} />
          <StatBlock label="Burned" value={week.totalCaloriesBurned} unit="kcal" icon={Flame} />
          <StatBlock label="Time" value={week.totalDurationMin} unit="mins" icon={Clock} />
        </div>
      </div>
    </div>
  );
}
