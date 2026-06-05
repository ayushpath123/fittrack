"use client";

import Link from "next/link";
import { Clock, Flame } from "lucide-react";
import type { WorkoutLogType } from "@/types/workout";

type TodayWorkoutsTimelineProps = {
  workouts: WorkoutLogType[];
};

export function TodayWorkoutsTimeline({ workouts }: TodayWorkoutsTimelineProps) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between px-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
          Today&apos;s Workouts
        </p>
        <Link href="/workout" className="text-[10px] font-semibold text-[#B8E86A]">
          View all
        </Link>
      </div>

      {!workouts.length ? (
        <div className="rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.02] px-4 py-5 text-center text-[12px] text-[var(--muted)]">
          No workouts logged today.{" "}
          <Link href="/workout?action=log" className="font-semibold text-[#B8E86A]">
            Log Workout
          </Link>
        </div>
      ) : (
        <div className="premium-card space-y-0 divide-y divide-white/[0.06] rounded-[var(--radius-card)] px-4 py-1">
          {workouts.map((w) => {
            const time = new Date(w.createdAt).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" });
            return (
              <div key={w.id} className="flex items-center justify-between gap-3 py-3 first:pt-2 last:pb-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--white)]">{w.workoutName}</p>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-[var(--muted)]">
                    <span className="inline-flex items-center gap-1">
                      <Clock size={11} aria-hidden />
                      {w.duration} min
                    </span>
                    <span className="inline-flex items-center gap-1 text-[#FFB547]">
                      <Flame size={11} aria-hidden />
                      {w.caloriesBurned} kcal
                    </span>
                  </div>
                </div>
                <span className="shrink-0 text-[10px] font-medium tabular-nums text-[var(--hint)]">{time}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
