"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Droplets, Dumbbell, Scale, Utensils } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonCard } from "@/components/SkeletonCard";

type AnalyticsPayload = {
  range: string;
  targets: { calorieTarget: number; proteinTarget: number; carbTarget: number; fatTarget: number };
  summary: {
    avgCalories: number;
    avgProtein: number;
    avgCarbs: number;
    avgFat: number;
    adherence: number;
    workoutCount: number;
    weightTrend: { weeklyDelta: number; monthlyDelta: number };
    projectedFatLoss: number;
  };
  insights: { text: string; confidence: string }[];
};

export function WeeklyReviewClient() {
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [hydration, setHydration] = useState<{ date: string; totalMl: number }[] | null>(null);
  const [goalMl, setGoalMl] = useState(2000);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [aRes, hRes, gRes] = await Promise.all([
          fetch("/api/analytics/summary?range=7d", { credentials: "include" }),
          fetch("/api/hydration/week", { credentials: "include" }),
          fetch("/api/settings/goals", { credentials: "include" }),
        ]);
        if (!aRes.ok) throw new Error("analytics");
        const a = (await aRes.json()) as AnalyticsPayload;
        const h = hRes.ok ? ((await hRes.json()) as { days: { date: string; totalMl: number }[] }).days : [];
        const g = gRes.ok ? await gRes.json() : {};
        if (!cancelled) {
          setAnalytics(a);
          setHydration(h);
          setGoalMl(typeof g.waterTargetMl === "number" ? g.waterTargetMl : 2000);
        }
      } catch {
        if (!cancelled) setError("Could not load this week’s summary.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-48 rounded-lg bg-gray-100 dark:bg-slate-700 animate-pulse" />
        <SkeletonCard lines={3} />
        <SkeletonCard lines={2} />
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div>
        <EmptyState title="Weekly review" subtitle={error || "Something went wrong."} />
      </div>
    );
  }

  const hDays = hydration ?? [];
  const hydrationHitDays = hDays.filter((d) => d.totalMl >= goalMl * 0.85).length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">This week</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400">7-day snapshot · same engine as Stats</p>
      </div>

      <div className="premium-card rounded-2xl p-4 space-y-3">
        <p className="text-sm font-semibold text-gray-800 dark:text-slate-100 flex items-center gap-2">
          <Utensils size={16} className="text-[#BEFF47] dark:text-[#B8E86A]" />
          Nutrition averages
        </p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-500 dark:text-slate-400">Calories / day</p>
            <p className="font-bold text-gray-900 dark:text-white">
              {analytics.summary.avgCalories}{" "}
              <span className="text-xs font-normal text-gray-500">/ {analytics.targets.calorieTarget}</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-slate-400">Protein / day</p>
            <p className="font-bold text-gray-900 dark:text-white">
              {analytics.summary.avgProtein}g{" "}
              <span className="text-xs font-normal text-gray-500">/ {analytics.targets.proteinTarget}g</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-slate-400">Carbs / day</p>
            <p className="font-bold text-gray-900 dark:text-white">{analytics.summary.avgCarbs}g</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-slate-400">Fat / day</p>
            <p className="font-bold text-gray-900 dark:text-white">{analytics.summary.avgFat}g</p>
          </div>
        </div>
        <p className="text-xs text-gray-600 dark:text-slate-300">
          <span className="font-medium">Adherence (in range):</span> {analytics.summary.adherence}%
        </p>
      </div>

      <div className="premium-card rounded-2xl p-4 space-y-3">
        <p className="text-sm font-semibold text-gray-800 dark:text-slate-100 flex items-center gap-2">
          <Dumbbell size={16} className="text-violet-600 dark:text-violet-400" />
          Training
        </p>
        <p className="text-sm text-gray-700 dark:text-slate-200">
          <span className="font-bold text-lg">{analytics.summary.workoutCount}</span> workout
          {analytics.summary.workoutCount === 1 ? "" : "s"} logged in the last 7 days.
        </p>
      </div>

      <div className="premium-card rounded-2xl p-4 space-y-3">
        <p className="text-sm font-semibold text-gray-800 dark:text-slate-100 flex items-center gap-2">
          <Scale size={16} className="text-emerald-600 dark:text-emerald-400" />
          Weight
        </p>
        <p className="text-sm text-gray-700 dark:text-slate-200">
          Change vs last week:{" "}
          <span className="font-semibold">
            {analytics.summary.weightTrend.weeklyDelta > 0 ? "+" : ""}
            {analytics.summary.weightTrend.weeklyDelta} kg
          </span>
        </p>
        <p className="text-xs text-gray-500 dark:text-slate-400">Longer trends live under Stats.</p>
      </div>

      <div className="premium-card rounded-2xl p-4 space-y-3">
        <p className="text-sm font-semibold text-gray-800 dark:text-slate-100 flex items-center gap-2">
          <Droplets size={16} className="text-sky-600 dark:text-sky-400" />
          Hydration
        </p>
        <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">Goal ~{goalMl} ml/day · days near goal (≥85%)</p>
        <div className="flex gap-1 justify-between">
          {hDays.map((d) => {
            const pct = goalMl > 0 ? Math.min(100, (d.totalMl / goalMl) * 100) : 0;
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <div
                  className="w-full max-w-[28px] mx-auto rounded-t-md bg-sky-100 dark:bg-slate-700 h-16 flex flex-col justify-end overflow-hidden"
                  title={`${d.date}: ${d.totalMl} ml`}
                >
                  <div
                    className="w-full bg-sky-500 dark:bg-sky-400 rounded-t-sm transition-all"
                    style={{ height: `${pct}%`, minHeight: d.totalMl > 0 ? 4 : 0 }}
                  />
                </div>
                <span className="text-[9px] text-gray-400 dark:text-slate-500 truncate w-full text-center">
                  {d.date.slice(5)}
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-sm text-gray-700 dark:text-slate-200">
          <span className="font-semibold">{hydrationHitDays}</span> / 7 days on track for water
        </p>
      </div>

      <div className="premium-card rounded-2xl p-4">
        <p className="text-sm font-semibold text-gray-800 dark:text-slate-100 mb-2">Focus for next week</p>
        <ul className="space-y-2 text-sm text-gray-700 dark:text-slate-200">
          {analytics.summary.avgProtein < analytics.targets.proteinTarget * 0.9 && (
            <li>· Push protein closer to {analytics.targets.proteinTarget}g daily.</li>
          )}
          {analytics.summary.adherence < 70 && (
            <li>· Aim for more days at or under your calorie target.</li>
          )}
          {analytics.summary.workoutCount < 3 && (
            <li>· Add 1–2 more training sessions if your plan allows.</li>
          )}
          {hydrationHitDays < 4 && (
            <li>· Hit your water goal on more days — check the home hydration widget.</li>
          )}
          {analytics.summary.avgProtein >= analytics.targets.proteinTarget * 0.9 &&
            analytics.summary.adherence >= 70 &&
            analytics.summary.workoutCount >= 3 &&
            hydrationHitDays >= 4 && (
              <li>· Solid week — keep the rhythm or tighten one variable (steps, sleep, or load).</li>
            )}
        </ul>
        <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-2">
          Est. fat change if deficit holds: ~{analytics.summary.projectedFatLoss} kg / 30d (rough model).
        </p>
      </div>

      {analytics.insights.length > 0 && (
        <div className="premium-card rounded-2xl p-4 space-y-2">
          <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">Insights</p>
          {analytics.insights.slice(0, 4).map((i, idx) => (
            <p key={idx} className="text-sm text-gray-700 dark:text-slate-200 leading-snug">
              {i.text}
            </p>
          ))}
        </div>
      )}

      <Link
        href="/analytics"
        className="flex items-center justify-between premium-card rounded-2xl p-4 active:scale-[0.99] transition-transform"
      >
        <span className="text-sm font-semibold text-gray-900 dark:text-white">Open full Stats</span>
        <ChevronRight className="text-gray-400" size={20} />
      </Link>
    </div>
  );
}
