"use client";

import Link from "next/link";
import { ChevronRight, Scale } from "lucide-react";
import { WeightMiniChart } from "@/components/WeightMiniChart";
import { computeWeightAnalytics, WEIGHT_UNIT } from "@/lib/weight-analytics";
import type { WeightLogType } from "@/types";

type WeightProgressCardProps = {
  logs: WeightLogType[];
};

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-2.5 py-2">
      <p className="text-[9px] font-semibold uppercase tracking-widest text-[var(--muted)]">{label}</p>
      <p className="num mt-0.5 text-sm font-bold text-[var(--white)]">{value}</p>
    </div>
  );
}

export function WeightProgressCard({ logs }: WeightProgressCardProps) {
  const analytics = computeWeightAnalytics(logs);

  if (logs.length === 0) {
    return (
      <section className="premium-card rounded-[var(--radius-card)] p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Weight</p>
            <p className="mt-1 text-sm text-[var(--muted)]">No weight logged yet</p>
          </div>
          <Scale size={18} className="shrink-0 text-[#A78BFA]" aria-hidden />
        </div>
        <Link
          href="/weight"
          className="mt-3 inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#B8E86A]"
        >
          Open weight tracker
          <ChevronRight size={12} aria-hidden />
        </Link>
      </section>
    );
  }

  const monthlyChange =
    analytics.monthlyChange !== null
      ? `${analytics.monthlyChange > 0 ? "+" : ""}${analytics.monthlyChange.toFixed(1)} ${WEIGHT_UNIT}`
      : "—";

  const chartLogs = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-7);

  return (
    <section className="premium-card rounded-[var(--radius-card)] p-3.5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Weight</p>
        <Link href="/weight" className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#B8E86A]">
          Details
          <ChevronRight size={12} aria-hidden />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MetricCell
          label="Current"
          value={analytics.currentWeight != null ? `${analytics.currentWeight.toFixed(1)} ${WEIGHT_UNIT}` : "—"}
        />
        <MetricCell
          label="7-Day Avg"
          value={analytics.avg7d != null ? `${analytics.avg7d.toFixed(1)} ${WEIGHT_UNIT}` : "—"}
        />
        <MetricCell
          label="30-Day Avg"
          value={analytics.avg30d != null ? `${analytics.avg30d.toFixed(1)} ${WEIGHT_UNIT}` : "—"}
        />
        <MetricCell label="Monthly Change" value={monthlyChange} />
      </div>

      {chartLogs.length >= 2 ? (
        <div className="mt-3 -mx-1">
          <WeightMiniChart data={chartLogs} />
        </div>
      ) : null}
    </section>
  );
}
