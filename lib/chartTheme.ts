export const darkTooltip = {
  contentStyle: {
    background: "#1C1C2C",
    border: "1px solid rgba(255,255,255,.10)",
    borderRadius: 12,
    fontSize: 12,
    color: "#F4F4FF",
    boxShadow: "0 8px 32px rgba(0,0,0,.4)",
  },
  itemStyle: { color: "#F4F4FF" },
  labelStyle: { color: "rgba(244,244,255,.5)", fontWeight: 600 },
  cursor: { fill: "rgba(255,255,255,.04)" },
} as const;

export const axisStyle = {
  tick: { fill: "rgba(244,244,255,.3)", fontSize: 11 },
  axisLine: false,
  tickLine: false,
} as const;

export const chartColors = {
  weight: "#BEFF47",
  avg: "#FFB547",
  calories: "#A78BFA",
  protein: "#2DD4A0",
} as const;
