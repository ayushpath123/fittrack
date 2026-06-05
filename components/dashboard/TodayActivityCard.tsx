"use client";

import Link from "next/link";
import { Clock, Dumbbell, Flame } from "lucide-react";
import type { WorkoutDaySummary, WorkoutLogType } from "@/types/workout";

type TodayActivityCardProps = {
  summary: WorkoutDaySummary;
  latestWorkout: WorkoutLogType | null;
};

export function TodayActivityCard({ summary, latestWorkout }: TodayActivityCardProps) {
  const workoutLabel = summary.workoutCount === 1 ? "Workout" : "Workouts";

  return (
    <section className="premium-card rounded-[var(--radius-card)] p-3.5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Today&apos;s Activity</p>
        <Link href="/workout" className="text-[10px] font-semibold text-[#B8E86A]">
          View all
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-2 py-2.5 text-center">
          <Dumbbell size={14} className="mx-auto text-[var(--muted)]" aria-hidden />
          <p className="num mt-1 text-lg font-bold text-[var(--white)]">{summary.workoutCount}</p>
          <p className="text-[9px] text-[var(--hint)]">{workoutLabel}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-2 py-2.5 text-center">
          <Flame size={14} className="mx-auto text-[#FFB547]" aria-hidden />
          <p className="num mt-1 text-lg font-bold text-[var(--white)]">{summary.totalCaloriesBurned}</p>
          <p className="text-[9px] text-[var(--hint)]">kcal burned</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-2 py-2.5 text-center">
          <Clock size={14} className="mx-auto text-[var(--muted)]" aria-hidden />
          <p className="num mt-1 text-lg font-bold text-[var(--white)]">{summary.totalDurationMin}</p>
          <p className="text-[9px] text-[var(--hint)]">min</p>
        </div>
      </div>

      {latestWorkout ? (
        <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-[var(--muted)]">Latest workout</p>
          <p className="mt-0.5 truncate text-sm font-semibold text-[var(--white)]">{latestWorkout.workoutName}</p>
          <p className="mt-0.5 text-[11px] text-[var(--muted)]">
            {latestWorkout.duration} min · {latestWorkout.caloriesBurned} kcal
          </p>
        </div>
      ) : (
        <p className="mt-3 text-center text-xs text-[var(--muted)]">No workouts logged today</p>
      )}
    </section>
  );
}
