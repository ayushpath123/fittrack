"use client";

import { Bar, BarChart, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { axisStyle, chartColors, darkTooltip } from "@/lib/chartTheme";

interface AnimatedBarChartProps {
  data: { week: string; calories: number }[];
  target?: number;
}

function AnimatedBar(props: { x?: number; y?: number; width?: number; height?: number; fill?: string; index?: number }) {
  const { x = 0, y = 0, width = 0, height = 0, fill = chartColors.calories, index = 0 } = props;
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      rx={6}
      fill={fill}
      style={{
        transformOrigin: `${x + width / 2}px ${y + height}px`,
        animation: `bar-rise .65s cubic-bezier(.22,1,.36,1) ${100 + index * 80}ms both`,
        opacity: 0,
      }}
    />
  );
}

export function AnimatedBarChart({ data, target = 1500 }: AnimatedBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -20 }} barCategoryGap="30%">
        <XAxis dataKey="week" tick={axisStyle.tick} axisLine={axisStyle.axisLine} tickLine={axisStyle.tickLine} />
        <YAxis tick={axisStyle.tick} axisLine={axisStyle.axisLine} tickLine={axisStyle.tickLine} />
        <Tooltip
          contentStyle={darkTooltip.contentStyle}
          cursor={darkTooltip.cursor}
        />
        <ReferenceLine
          y={target}
          stroke="#FCA5A5"
          strokeDasharray="4 4"
          label={{ value: "target", position: "insideTopRight", fill: "#FCA5A5", fontSize: 10 }}
        />
        <Bar dataKey="calories" shape={<AnimatedBar />} maxBarSize={52} isAnimationActive={false}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.calories > target ? "#FF5C7A" : chartColors.calories} />
          ))}
          <LabelList dataKey="calories" position="top" style={{ fontSize: 9, fill: "rgba(244,244,255,.45)", fontWeight: 600 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
