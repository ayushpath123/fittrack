"use client";

import Link from "next/link";
import { ChevronRight, Scale } from "lucide-react";
import {
  computeWeightAnalytics,
  trendStatusLabel,
  WEIGHT_UNIT,
} from "@/lib/weight-analytics";
import type { WeightLogType } from "@/types";

type WeightSummaryCardProps = {
  logs: WeightLogType[];
  onLogClick: () => void;
  compact?: boolean;
};

function MetricPill({ label, value, prominent }: { label: string; value: string; prominent?: boolean }) {
  return (
    <div className={`rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 ${prominent ? "border-[rgba(167,139,250,.25)] bg-[rgba(167,139,250,.08)]" : ""}`}>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">{label}</p>
      <p className={`mt-1 font-bold text-[var(--white)] ${prominent ? "text-xl" : "text-base"}`}>{value}</p>
    </div>
  );
}

export function WeightSummaryCard({ logs, onLogClick, compact = false }: WeightSummaryCardProps) {
  const analytics = computeWeightAnalytics(logs);
  const trendLabel = trendStatusLabel(analytics.trendStatus);
  const trendColor =
    analytics.trendStatus === "losing"
      ? "text-emerald-400"
      : analytics.trendStatus === "gaining"
        ? "text-amber-400"
        : "text-[var(--muted)]";

  if (logs.length === 0) {
    return (
      <section className="premium-card rounded-[var(--radius-card)] p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Weight</p>
            <p className="mt-1 text-sm text-[var(--muted)]">Track your first weight to start monitoring progress.</p>
          </div>
          <Scale size={18} className="shrink-0 text-[#A78BFA]" aria-hidden />
        </div>
        <button
          type="button"
          onClick={onLogClick}
          className="mt-3 w-full rounded-xl bg-[#A78BFA] py-2.5 text-sm font-semibold text-[#06080A]"
        >
          Log Weight
        </button>
      </section>
    );
  }

  const monthlyLabel =
    analytics.monthlyChange !== null
      ? `${analytics.monthlyChange > 0 ? "+" : ""}${analytics.monthlyChange.toFixed(1)} kg this month`
      : "—";

  return (
    <section className="premium-card rounded-[var(--radius-card)] p-3.5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Weight</p>
          <p className="mt-0.5 text-2xl font-bold text-[var(--white)]">
            {analytics.currentWeight?.toFixed(1)} {WEIGHT_UNIT}
          </p>
          {analytics.lastUpdatedLabel ? (
            <p className="mt-0.5 text-[11px] text-[var(--hint)]">{analytics.lastUpdatedLabel}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {!compact ? (
            <Link
              href="/weight"
              className="inline-flex shrink-0 items-center gap-0.5 text-[10px] font-semibold text-[#B8E86A]"
            >
              Details
              <ChevronRight size={12} aria-hidden />
            </Link>
          ) : null}
          <button
            type="button"
            onClick={onLogClick}
            className="rounded-xl border border-[rgba(167,139,250,.35)] bg-[rgba(167,139,250,.12)] px-3 py-1.5 text-[11px] font-semibold text-[#C4B5FD]"
          >
            Log Weight
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MetricPill
          label="7-day average"
          value={analytics.avg7d != null ? `${analytics.avg7d.toFixed(1)} ${WEIGHT_UNIT}` : "—"}
          prominent
        />
        <MetricPill
          label="30-day average"
          value={analytics.avg30d != null ? `${analytics.avg30d.toFixed(1)} ${WEIGHT_UNIT}` : "—"}
        />
        <MetricPill label="Monthly change" value={monthlyLabel} />
        <MetricPill label="Trend" value={trendLabel || "—"} />
      </div>

      {trendLabel ? <p className={`mt-2 text-center text-xs font-medium ${trendColor}`}>{trendLabel}</p> : null}
    </section>
  );
}
