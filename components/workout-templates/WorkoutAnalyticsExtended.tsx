"use client";

import { Clock, Dumbbell, Flame, Target, TrendingUp } from "lucide-react";
import type { WorkoutAnalyticsSnapshot, WorkoutDaySummary } from "@/types/workout";

type WorkoutAnalyticsExtendedProps = {
  today: WorkoutDaySummary;
  week: WorkoutDaySummary;
  analytics: WorkoutAnalyticsSnapshot | null;
};

function StatBlock({
  label,
  value,
  unit,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  unit: string;
  icon: typeof Flame;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-center">
      <Icon size={14} className="mx-auto text-[var(--muted)]" aria-hidden />
      <p className="num mt-1 text-lg font-bold text-[var(--white)]">{value}</p>
      <p className="text-[9px] text-[var(--hint)]">{unit}</p>
      <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-widest text-[var(--muted)]">{label}</p>
    </div>
  );
}

export function WorkoutAnalyticsExtended({ today, week, analytics }: WorkoutAnalyticsExtendedProps) {
  return (
    <div className="space-y-4">
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
          <StatBlock label="Sessions" value={week.workoutCount} unit="logged" icon={Dumbbell} />
          <StatBlock label="Burned" value={week.totalCaloriesBurned} unit="kcal" icon={Flame} />
          <StatBlock
            label="Active Days"
            value={analytics?.weekly.activeDays ?? "—"}
            unit="of 7"
            icon={TrendingUp}
          />
        </div>
      </div>

      {analytics ? (
        <>
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">This Month</p>
            <div className="grid grid-cols-3 gap-2">
              <StatBlock label="Sessions" value={analytics.monthly.workoutCount} unit="logged" icon={Dumbbell} />
              <StatBlock
                label="Avg Duration"
                value={analytics.monthly.avgDurationMin}
                unit="mins"
                icon={Clock}
              />
              <StatBlock
                label="Top Group"
                value={analytics.monthly.mostTrainedMuscleGroup ?? "—"}
                unit="trained"
                icon={Target}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="text-center">
              <p className="num text-lg font-bold text-[#BEFF47]">{analytics.streak.current}</p>
              <p className="text-[9px] text-[var(--muted)]">Current Streak</p>
            </div>
            <div className="text-center">
              <p className="num text-lg font-bold text-[var(--white)]">{analytics.streak.longest}</p>
              <p className="text-[9px] text-[var(--muted)]">Longest Streak</p>
            </div>
            <div className="text-center">
              <p className="num text-lg font-bold text-[var(--white)]">{analytics.streak.weeklyCompletionRate}%</p>
              <p className="text-[9px] text-[var(--muted)]">Week Rate</p>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
