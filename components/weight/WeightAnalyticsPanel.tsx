"use client";

import { computeWeightAnalytics, WEIGHT_UNIT } from "@/lib/weight-analytics";
import type { WeightLogType } from "@/types";

type WeightAnalyticsPanelProps = {
  logs: WeightLogType[];
};

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-lg font-bold text-[var(--white)]">{value}</p>
    </div>
  );
}

export function WeightAnalyticsPanel({ logs }: WeightAnalyticsPanelProps) {
  const a = computeWeightAnalytics(logs);

  const formatChange = (v: number | null) => {
    if (v === null) return "—";
    return `${v > 0 ? "+" : ""}${v.toFixed(1)} ${WEIGHT_UNIT}`;
  };

  return (
    <div className="premium-card rounded-2xl p-4">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Analytics</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <StatCell label="Current weight" value={a.currentWeight != null ? `${a.currentWeight.toFixed(1)} ${WEIGHT_UNIT}` : "—"} />
        <StatCell label="Starting weight" value={a.startingWeight != null ? `${a.startingWeight.toFixed(1)} ${WEIGHT_UNIT}` : "—"} />
        <StatCell label="Total change" value={formatChange(a.totalChange)} />
        <StatCell label="7-day average" value={a.avg7d != null ? `${a.avg7d.toFixed(1)} ${WEIGHT_UNIT}` : "—"} />
        <StatCell label="30-day average" value={a.avg30d != null ? `${a.avg30d.toFixed(1)} ${WEIGHT_UNIT}` : "—"} />
        <StatCell label="Lowest weight" value={a.lowest != null ? `${a.lowest.toFixed(1)} ${WEIGHT_UNIT}` : "—"} />
        <StatCell label="Highest weight" value={a.highest != null ? `${a.highest.toFixed(1)} ${WEIGHT_UNIT}` : "—"} />
        <StatCell label="Monthly change" value={formatChange(a.monthlyChange)} />
      </div>
    </div>
  );
}
