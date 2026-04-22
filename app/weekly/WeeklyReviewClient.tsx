"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonCard } from "@/components/SkeletonCard";

type WeeklyReport = {
  week_summary: {
    avg_daily_calories: number;
    calorie_vs_target: string;
    protein_consistency: string;
    logging_consistency: string;
  };
  best_day: { day: string; why: string };
  pattern_found: { pattern: string; evidence: string };
  next_week_adjustment: { action: string; expected_impact: string };
};

export function WeeklyReviewClient() {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [hasPro, setHasPro] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const billingRes = await fetch("/api/billing/status", { credentials: "include" });
        const billingData = billingRes.ok ? ((await billingRes.json()) as { hasPro?: boolean }) : { hasPro: false };
        if (!billingData.hasPro) {
          if (!cancelled) {
            setHasPro(false);
            setReport(null);
            setError("");
          }
          return;
        }
        if (!cancelled) setHasPro(true);
        const aRes = await fetch("/api/weekly-report", { credentials: "include" });
        if (!aRes.ok) throw new Error("weekly");
        const a = (await aRes.json()) as { report?: WeeklyReport | null };
        if (!cancelled) {
          setReport(a.report ?? null);
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

  if (error) {
    return (
      <div>
        <EmptyState title="Weekly review" subtitle={error} />
      </div>
    );
  }

  if (!hasPro) {
    return (
      <div className="premium-card rounded-2xl p-4 space-y-3">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">Weekly report is a Pro feature</p>
        <p className="text-sm text-gray-700 dark:text-slate-200">Upgrade to unlock AI-generated weekly coaching reports.</p>
        <Link
          href="/pricing"
          className="inline-flex w-full items-center justify-center rounded-xl bg-[linear-gradient(135deg,#BEFF47,#7E73F6)] py-2.5 text-sm font-semibold text-white"
        >
          View Pro pricing
        </Link>
      </div>
    );
  }

  async function generate() {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/weekly-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ force: true }),
      });
      const data = (await res.json()) as WeeklyReport & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not generate report.");
        return;
      }
      setReport(data);
    } catch {
      setError("Network error while generating report.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Weekly report</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400">AI coach review for your last 7 days</p>
      </div>

      {!report ? (
        <div className="premium-card rounded-2xl p-4 space-y-3">
          <p className="text-sm text-gray-700 dark:text-slate-200">
            No report available yet. Generate your first weekly report.
          </p>
          <button
            type="button"
            onClick={() => void generate()}
            disabled={generating}
            className="rounded-xl bg-[linear-gradient(135deg,#BEFF47,#7E73F6)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {generating ? "Generating..." : "Generate report"}
          </button>
        </div>
      ) : null}

      {report ? (
        <>
          <div className="premium-card rounded-2xl p-4 space-y-2">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Week summary</p>
            <p className="text-sm text-gray-700 dark:text-slate-200">Avg calories: {report.week_summary.avg_daily_calories}</p>
            <p className="text-sm text-gray-700 dark:text-slate-200">{report.week_summary.calorie_vs_target}</p>
            <p className="text-sm text-gray-700 dark:text-slate-200">{report.week_summary.protein_consistency}</p>
            <p className="text-sm text-gray-700 dark:text-slate-200">{report.week_summary.logging_consistency}</p>
          </div>

          <div className="premium-card rounded-2xl p-4 space-y-2">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Best day</p>
            <p className="text-sm text-gray-700 dark:text-slate-200">{report.best_day.day}</p>
            <p className="text-sm text-gray-700 dark:text-slate-200">{report.best_day.why}</p>
          </div>

          <div className="premium-card rounded-2xl p-4 space-y-2">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Pattern found</p>
            <p className="text-sm text-gray-700 dark:text-slate-200">{report.pattern_found.pattern}</p>
            <p className="text-sm text-gray-700 dark:text-slate-200">{report.pattern_found.evidence}</p>
          </div>

          <div className="premium-card rounded-2xl p-4 space-y-2">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Next week adjustment</p>
            <p className="text-sm text-gray-700 dark:text-slate-200">{report.next_week_adjustment.action}</p>
            <p className="text-sm text-gray-700 dark:text-slate-200">{report.next_week_adjustment.expected_impact}</p>
            <button
              type="button"
              onClick={() => void generate()}
              disabled={generating}
              className="mt-2 rounded-xl border border-[rgba(255,255,255,.2)] px-3 py-1.5 text-xs text-gray-700 dark:text-slate-200 disabled:opacity-60"
            >
              {generating ? "Refreshing..." : "Refresh report"}
            </button>
          </div>
        </>
      ) : null}

      {error ? (
        <div className="premium-card rounded-2xl p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      ) : null}

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
