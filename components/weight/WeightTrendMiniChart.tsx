"use client";

import { useMemo } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { buildWeightSeries } from "@/lib/weight-chart-data";
import type { WeightLogType } from "@/types";

type WeightTrendMiniChartProps = {
  logs: WeightLogType[];
};

export function WeightTrendMiniChart({ logs }: WeightTrendMiniChartProps) {
  const data = useMemo(() => buildWeightSeries(logs), [logs]);

  const logged = data.filter((d): d is { dateKey: string; label: string; weight: number } => d.weight != null);
  const latest = logged[logged.length - 1]?.weight;
  const weights = logged.map((d) => d.weight);
  const minW = weights.length ? Math.min(...weights) : 0;
  const maxW = weights.length ? Math.max(...weights) : 1;
  const pad = Math.max(0.3, (maxW - minW) * 0.15 || 1);

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between px-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
          Last 7 days
        </p>
        <p className="text-[9px] text-[var(--hint)]">
          {latest != null ? `${latest.toFixed(1)} kg latest` : "—"}
        </p>
      </div>
      <div className="premium-card rounded-[var(--radius-card)] p-2.5 !shadow-none hover:!shadow-none">
        <div className="h-[104px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "rgba(244,244,255,.45)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide domain={weights.length ? [minW - pad, maxW + pad] : [0, 1]} />
              <Tooltip
                contentStyle={{
                  background: "rgba(12,14,22,.95)",
                  border: "1px solid rgba(255,255,255,.1)",
                  borderRadius: 10,
                  fontSize: 11,
                }}
                formatter={(v) => [`${Number(v).toFixed(1)} kg`, "Weight"]}
                labelFormatter={(label) => String(label)}
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#A78BFA"
                strokeWidth={2.5}
                connectNulls
                dot={{ r: 3, fill: "#A78BFA", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#A78BFA" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
