"use client";

import Link from "next/link";
import { CheckCircle2, Clock, Dumbbell, Flame, Play, Target } from "lucide-react";
import type { TodayWorkoutPlan } from "@/types/dashboard";

const statusStyles = {
  not_started: { label: "Scheduled", color: "text-[#57B4FF]", bg: "bg-[rgba(87,180,255,.12)]" },
  in_progress: { label: "In progress", color: "text-[#FFB547]", bg: "bg-[rgba(255,181,71,.12)]" },
  completed: { label: "Completed", color: "text-[#2DD4A0]", bg: "bg-[rgba(45,212,160,.12)]" },
} as const;

export function TodayPlan({ plan }: { plan: TodayWorkoutPlan }) {
  const style = statusStyles[plan.status];

  return (
    <section>
      <p className="mb-2 px-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Today&apos;s plan</p>
      <div className="premium-card rounded-[var(--radius-card)] p-4">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-[var(--white)]">{plan.title}</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {plan.muscleGroups.map((group) => (
                <span
                  key={group}
                  className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]"
                >
                  {group}
                </span>
              ))}
            </div>
          </div>
          <span className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-semibold ${style.bg} ${style.color}`}>
            {style.label}
          </span>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-2.5 py-2 text-center">
            <Clock size={14} className="mx-auto text-[var(--muted)]" aria-hidden />
            <p className="num mt-1 text-sm font-bold text-[var(--white)]">{plan.durationMin}</p>
            <p className="text-[9px] text-[var(--hint)]">min</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-2.5 py-2 text-center">
            <Flame size={14} className="mx-auto text-[var(--muted)]" aria-hidden />
            <p className="num mt-1 text-sm font-bold text-[var(--white)]">{plan.estimatedCalories}</p>
            <p className="text-[9px] text-[var(--hint)]">kcal burned</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-2.5 py-2 text-center">
            <Dumbbell size={14} className="mx-auto text-[var(--muted)]" aria-hidden />
            <p className="num mt-1 text-sm font-bold text-[var(--white)]">{plan.exerciseCount || "—"}</p>
            <p className="text-[9px] text-[var(--hint)]">exercises</p>
          </div>
        </div>

        {plan.status === "completed" ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-[rgba(45,212,160,.2)] bg-[rgba(45,212,160,.08)] py-3 text-sm font-semibold text-[#2DD4A0]">
            <CheckCircle2 size={16} aria-hidden />
            Session complete
          </div>
        ) : (
          <Link
            href="/workout?action=start"
            className="btn-accent flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold"
          >
            <Play size={15} fill="currentColor" aria-hidden />
            Start Workout
          </Link>
        )}

        {plan.status === "not_started" ? (
          <p className="mt-2 flex items-center justify-center gap-1 text-[10px] text-[var(--hint)]">
            <Target size={11} aria-hidden />
            Personalized from your recent training pattern
          </p>
        ) : null}
      </div>
    </section>
  );
}
