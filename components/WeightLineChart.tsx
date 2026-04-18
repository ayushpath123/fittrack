"use client";

import { Area, ComposedChart, Line, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { WeightLogType } from "@/types";
import { calculateMovingAverage } from "@/lib/calculations";
import { axisStyle, chartColors, darkTooltip } from "@/lib/chartTheme";

interface WeightLineChartProps {
  logs: WeightLogType[];
}

function AnimatedDot(props: { cx?: number; cy?: number; index?: number }) {
  const { cx, cy, index = 0 } = props;
  if (cx == null || cy == null) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill={chartColors.weight}
      stroke="white"
      strokeWidth={2}
      style={{
        animation: `dot-pop .35s cubic-bezier(.22,1,.36,1) ${1200 + index * 100}ms both`,
        transformOrigin: `${cx}px ${cy}px`,
        opacity: 0,
      }}
    />
  );
}

function ActiveDot(props: { cx?: number; cy?: number }) {
  const { cx, cy } = props;
  if (cx == null || cy == null) return null;
  return <circle cx={cx} cy={cy} r={6} fill={chartColors.weight} stroke="white" strokeWidth={2.5} style={{ filter: "drop-shadow(0 0 6px rgba(190,255,71,.5))" }} />;
}

export function WeightLineChart({ logs }: WeightLineChartProps) {
  const weights = logs.map((l) => l.weight);
  const ma = calculateMovingAverage(logs);
  const min = Math.min(...weights) - 0.8;
  const max = Math.max(...weights) + 0.8;

  const lowestIdx = weights.indexOf(Math.min(...weights));
  const lowest = logs[lowestIdx];

  const chartData = logs.map((l, i) => ({
    day: new Date(l.date).toLocaleDateString("en", { weekday: "short" }),
    weight: l.weight,
    avg: ma[i],
  }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={chartData} margin={{ top: 12, right: 4, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="wt-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartColors.weight} stopOpacity={0.2} />
              <stop offset="100%" stopColor={chartColors.weight} stopOpacity={0} />
            </linearGradient>
          </defs>

          <XAxis dataKey="day" tick={axisStyle.tick} axisLine={axisStyle.axisLine} tickLine={axisStyle.tickLine} />
          <YAxis domain={[min, max]} tick={axisStyle.tick} axisLine={axisStyle.axisLine} tickLine={axisStyle.tickLine} tickFormatter={(v: number) => v.toFixed(1)} />
          <Tooltip
            contentStyle={darkTooltip.contentStyle}
          />

          <Area dataKey="weight" stroke="none" fill="url(#wt-grad)" isAnimationActive animationDuration={800} animationBegin={1000} animationEasing="ease-out" />

          <Line
            dataKey="weight"
            stroke={chartColors.weight}
            strokeWidth={2.5}
            dot={<AnimatedDot />}
            activeDot={<ActiveDot />}
            isAnimationActive
            animationDuration={1100}
            animationBegin={100}
            animationEasing="ease-out"
          />

          <Line
            dataKey="avg"
            stroke={chartColors.avg}
            strokeWidth={1.5}
            strokeDasharray="5 4"
            dot={false}
            activeDot={false}
            isAnimationActive
            animationDuration={1300}
            animationBegin={350}
            animationEasing="ease-out"
          />

          {lowest && (
            <ReferenceDot
              x={chartData[lowestIdx]?.day}
              y={lowest.weight}
              r={6}
              fill="#16A34A"
              stroke="white"
              strokeWidth={2}
              label={{
                value: `${lowest.weight.toFixed(1)}`,
                position: "top",
                fill: "#16A34A",
                fontSize: 10,
                fontWeight: 700,
              }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
