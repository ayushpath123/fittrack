"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { WeightLogType } from "@/types";

export function WeightMiniChart({ data }: { data: WeightLogType[] }) {
  const chart = data.map((item) => ({
    day: new Date(item.date).toLocaleDateString("en", { weekday: "short" }),
    weight: item.weight,
  }));

  return (
    <ResponsiveContainer width="100%" height={100}>
      <AreaChart data={chart} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v) => [`${v} kg`, "Weight"]} />
        <Area dataKey="weight" stroke="#3B82F6" strokeWidth={2} fill="url(#wg)" dot={{ r: 3 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
