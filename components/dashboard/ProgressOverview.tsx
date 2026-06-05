"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { PremiumStatRing } from "@/components/dashboard/PremiumStatRing";
import type { WeightLogType } from "@/types";

type ProgressOverviewProps = {
  weightLogs: WeightLogType[];
  caloriesConsumed: number;
  calorieTarget: number;
  weeklyWorkoutsCompleted: number;
  weeklyWorkoutTarget: number;
  waterMl: number;
  waterGoalMl: number;
  dateKey: string;
  onWaterAdded?: (totalMl: number) => void;
};

function waistTrend(logs: WeightLogType[]): number | null {
  const withWaist = logs.filter((l) => l.waistCm != null);
  if (withWaist.length < 2) return null;
  return withWaist[withWaist.length - 1].waistCm! - withWaist[0].waistCm!;
}

export function ProgressOverview({
  weightLogs,
  caloriesConsumed,
  calorieTarget,
  weeklyWorkoutsCompleted,
  weeklyWorkoutTarget,
  waterMl: initialWaterMl,
  waterGoalMl,
  dateKey,
  onWaterAdded,
}: ProgressOverviewProps) {
  const [waterMl, setWaterMl] = useState(initialWaterMl);
  const [pending, setPending] = useState(false);

  const latestWeight = weightLogs[weightLogs.length - 1];
  const waistDelta = waistTrend(weightLogs);
  const caloriePct = Math.min(100, Math.round((caloriesConsumed / Math.max(1, calorieTarget)) * 100));
  const workoutPct = Math.min(100, Math.round((weeklyWorkoutsCompleted / Math.max(1, weeklyWorkoutTarget)) * 100));
  const waterPct = Math.min(100, Math.round((waterMl / Math.max(1, waterGoalMl)) * 100));

  async function addWater(ml: number) {
    setPending(true);
    try {
      const res = await fetch("/api/hydration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ addMl: ml, date: dateKey }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { totalMl: number };
      setWaterMl(data.totalMl);
      onWaterAdded?.(data.totalMl);
    } finally {
      setPending(false);
    }
  }

  return (
    <section id="hydration">
      <div className="mb-2 flex items-center justify-between px-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Progress overview</p>
        <Link href="/analytics" className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#B8E86A]">
          Details
          <ChevronRight size={12} aria-hidden />
        </Link>
      </div>

      <div className="premium-card rounded-[var(--radius-card)] p-3.5">
        <div className="grid grid-cols-3 gap-1 border-b border-white/[0.06] pb-3 sm:gap-2">
          <PremiumStatRing
            label="Weight"
            centerValue={latestWeight ? latestWeight.weight.toFixed(1) : "—"}
            centerUnit="kg"
            pct={latestWeight ? Math.min(100, Math.round(latestWeight.weight)) : 0}
            gradientFrom="#A78BFA"
            gradientTo="#8B5CF6"
            delay={0}
          />
          <PremiumStatRing
            label="Body comp"
            centerValue={waistDelta !== null ? `${waistDelta > 0 ? "+" : ""}${waistDelta.toFixed(1)}` : "—"}
            centerUnit="waist cm"
            pct={waistDelta !== null ? Math.min(100, Math.abs(waistDelta) * 20 + 40) : 0}
            gradientFrom="#2DD4A0"
            gradientTo="#14B88A"
            delay={0.05}
          />
          <PremiumStatRing
            label="Weekly"
            centerValue={`${weeklyWorkoutsCompleted}/${weeklyWorkoutTarget}`}
            centerUnit="workouts"
            pct={workoutPct}
            gradientFrom="#FFB547"
            gradientTo="#F59E0B"
            delay={0.1}
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">Calories vs target</p>
              <span className="num text-[11px] font-semibold text-[var(--white)]">{caloriePct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full" style={{ width: `${caloriePct}%`, background: "var(--accent-grad)" }} />
            </div>
            <p className="mt-1 text-[10px] text-[var(--muted)]">
              {Math.round(caloriesConsumed)} / {calorieTarget} kcal
            </p>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">Hydration</p>
              <span className="num text-[11px] font-semibold text-[#57B4FF]">{waterPct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#57B4FF]"
                style={{ width: `${waterPct}%` }}
              />
            </div>
            <div className="mt-1.5 flex gap-1">
              {[250, 500].map((ml) => (
                <button
                  key={ml}
                  type="button"
                  disabled={pending}
                  onClick={() => void addWater(ml)}
                  className="flex-1 rounded-lg border border-[rgba(87,180,255,.25)] bg-[rgba(87,180,255,.1)] py-0.5 text-[9px] font-semibold text-[#57B4FF] disabled:opacity-50"
                >
                  +{ml}ml
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
