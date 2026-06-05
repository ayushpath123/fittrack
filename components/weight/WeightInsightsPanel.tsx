"use client";

import { computeWeightAnalytics, generateWeightInsights } from "@/lib/weight-analytics";
import type { WeightLogType } from "@/types";

type WeightInsightsPanelProps = {
  logs: WeightLogType[];
};

export function WeightInsightsPanel({ logs }: WeightInsightsPanelProps) {
  const analytics = computeWeightAnalytics(logs);
  const insights = generateWeightInsights(analytics, logs);

  if (insights.length === 0) return null;

  return (
    <div className="premium-card rounded-2xl p-4">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Insights</p>
      <ul className="space-y-2">
        {insights.map((text) => (
          <li
            key={text}
            className="rounded-xl border border-[rgba(167,139,250,.2)] bg-[rgba(167,139,250,.06)] px-3 py-2.5 text-sm text-[var(--white)]"
          >
            {text}
          </li>
        ))}
      </ul>
    </div>
  );
}
