"use client";

import Link from "next/link";
import { ChevronRight, Droplets, Dumbbell } from "lucide-react";

type WeeklyGoalsStripProps = {
  weeklyWorkoutsCompleted: number;
  weeklyWorkoutTarget: number;
  waterMl: number;
  waterGoalMl: number;
};

export function WeeklyGoalsStrip({
  weeklyWorkoutsCompleted,
  weeklyWorkoutTarget,
  waterMl,
  waterGoalMl,
}: WeeklyGoalsStripProps) {
  const workoutPct = Math.min(100, Math.round((weeklyWorkoutsCompleted / Math.max(1, weeklyWorkoutTarget)) * 100));
  const waterPct = Math.min(100, Math.round((waterMl / Math.max(1, waterGoalMl)) * 100));

  return (
    <section className="premium-card rounded-[var(--radius-card)] p-3.5">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Weekly goals</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-1">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--white)]">
              <Dumbbell size={12} className="text-[#FFB547]" aria-hidden />
              Workouts
            </span>
            <Link href="/workout" className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-[#B8E86A]">
              View
              <ChevronRight size={10} aria-hidden />
            </Link>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full rounded-full bg-[#FFB547]"
              style={{ width: `${workoutPct}%` }}
            />
          </div>
          <p className="num mt-1 text-[10px] text-[var(--muted)]">
            {weeklyWorkoutsCompleted} / {weeklyWorkoutTarget} this week
          </p>
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-1">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--white)]">
              <Droplets size={12} className="text-[#57B4FF]" aria-hidden />
              Hydration
            </span>
            <Link href="/calendar" className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-[#B8E86A]">
              View
              <ChevronRight size={10} aria-hidden />
            </Link>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full rounded-full bg-[#57B4FF]"
              style={{ width: `${waterPct}%` }}
            />
          </div>
          <p className="num mt-1 text-[10px] text-[var(--muted)]">
            {waterMl} / {waterGoalMl} ml today
          </p>
        </div>
      </div>
    </section>
  );
}
