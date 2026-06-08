"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { WorkoutCaloriesPoint } from "@/lib/workout-chart-data";

type WorkoutCaloriesChartProps = {
  data: WorkoutCaloriesPoint[];
};

export function WorkoutCaloriesChart({ data }: WorkoutCaloriesChartProps) {
  const total = data.reduce((s, d) => s + d.calories, 0);
  const maxCal = Math.max(...data.map((d) => d.calories), 1);

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between px-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
          Last 7 days
        </p>
        <p className="text-[9px] text-[var(--hint)]">{total} kcal total</p>
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
              <YAxis hide domain={[0, maxCal]} />
              <Tooltip
                contentStyle={{
                  background: "rgba(12,14,22,.95)",
                  border: "1px solid rgba(255,255,255,.1)",
                  borderRadius: 10,
                  fontSize: 11,
                }}
                formatter={(v) => [`${v} kcal`, "Burned"]}
                labelFormatter={(label) => String(label)}
              />
              <Line
                type="monotone"
                dataKey="calories"
                stroke="#A78BFA"
                strokeWidth={2.5}
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
