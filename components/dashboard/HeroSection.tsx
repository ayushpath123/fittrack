"use client";

import Link from "next/link";
import { Flame, Play } from "lucide-react";
import { PremiumStatRing } from "@/components/dashboard/PremiumStatRing";

type HeroSectionProps = {
  workoutStatus: "not_started" | "in_progress" | "completed";
  workoutTitle: string;
  caloriesBurned: number;
  caloriesConsumed: number;
  calorieTarget: number;
  proteinConsumed: number;
  proteinTarget: number;
  streak: number;
  flameActive?: boolean;
};

const statusCopy = {
  not_started: "Ready to train",
  in_progress: "Workout in progress",
  completed: "Workout complete",
} as const;

export function HeroSection({
  workoutStatus,
  workoutTitle,
  caloriesBurned,
  caloriesConsumed,
  calorieTarget,
  proteinConsumed,
  proteinTarget,
  streak,
  flameActive,
}: HeroSectionProps) {
  const caloriePct = Math.min(100, Math.round((caloriesConsumed / Math.max(1, calorieTarget)) * 100));
  const proteinPct = Math.min(100, Math.round((proteinConsumed / Math.max(1, proteinTarget)) * 100));
  const remaining = Math.max(0, Math.round(calorieTarget - caloriesConsumed));
  const overTarget = caloriesConsumed > calorieTarget;

  return (
    <section className="premium-card overflow-hidden rounded-[var(--radius-card)] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Today&apos;s journey</p>
          <h2 className="mt-1 truncate text-lg font-bold text-[var(--white)]">{workoutTitle}</h2>
          <p className="mt-0.5 text-xs text-[var(--muted)]">{statusCopy[workoutStatus]}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 rounded-xl border border-orange-400/25 bg-orange-400/10 px-2.5 py-1.5">
          <Flame size={14} className={`text-orange-400 ${flameActive ? "animate-fire-flicker" : ""}`} aria-hidden />
          <span className="num text-sm font-bold text-[var(--white)]">{streak}</span>
          <span className="text-[10px] text-[var(--muted)]">streak</span>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-1 sm:gap-2">
        <PremiumStatRing
          label="Calories"
          centerValue={String(remaining)}
          centerUnit="left"
          pct={caloriePct}
          gradientFrom="#D2FF6E"
          gradientTo="#BEFF47"
          overAccent={overTarget}
          delay={0}
        />
        <PremiumStatRing
          label="Burned"
          centerValue={String(caloriesBurned)}
          centerUnit="kcal"
          pct={Math.min(100, Math.round((caloriesBurned / 400) * 100))}
          gradientFrom="#FFB547"
          gradientTo="#FF8C3A"
          delay={0.06}
        />
        <PremiumStatRing
          label="Protein"
          centerValue={String(Math.round(proteinConsumed))}
          centerUnit="g"
          pct={proteinPct}
          gradientFrom="#57B4FF"
          gradientTo="#3D9EEF"
          delay={0.12}
        />
      </div>

      <Link
        href={workoutStatus === "completed" ? "/workout" : "/workout?action=start"}
        className="btn-accent flex min-h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold"
      >
        <Play size={16} fill="currentColor" aria-hidden />
        {workoutStatus === "completed" ? "View Workout" : workoutStatus === "in_progress" ? "Continue Workout" : "Quick Start Workout"}
      </Link>
    </section>
  );
}
