import { calculateWeightTrendDeltas } from "@/lib/calculations";
import type { WeightLogType } from "@/types";

export type WeightTrendStatus = "losing" | "gaining" | "stable";

export type WeightAnalytics = {
  currentWeight: number | null;
  startingWeight: number | null;
  totalChange: number | null;
  avg7d: number | null;
  avg30d: number | null;
  monthlyChange: number | null;
  trendStatus: WeightTrendStatus | null;
  lowest: number | null;
  highest: number | null;
  lastUpdatedLabel: string | null;
};

export function sortWeightLogsAsc(logs: WeightLogType[]): WeightLogType[] {
  return [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function averageOfLastN(weights: number[], n: number): number | null {
  if (weights.length === 0) return null;
  const slice = weights.slice(-Math.min(n, weights.length));
  const avg = slice.reduce((sum, w) => sum + w, 0) / slice.length;
  return Math.round(avg * 10) / 10;
}

export function getTrendStatus(change: number | null): WeightTrendStatus | null {
  if (change === null) return null;
  if (change > 0.5) return "gaining";
  if (change < -0.5) return "losing";
  return "stable";
}

export function formatWeightLastUpdated(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfLogDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfLogDay.getTime()) / 86400000);

  if (diffDays === 0) return "Last updated today";
  if (diffDays === 1) return "Updated yesterday";
  if (diffDays < 7) return `Updated ${diffDays} days ago`;
  return `Updated ${d.toLocaleDateString("en", { month: "short", day: "numeric" })}`;
}

export function formatWeightHistoryDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfLogDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfLogDay.getTime()) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" });
}

export function trendStatusLabel(status: WeightTrendStatus | null): string {
  if (status === "losing") return "↓ Losing weight";
  if (status === "gaining") return "↑ Gaining weight";
  if (status === "stable") return "→ Stable weight";
  return "";
}

export function computeWeightAnalytics(logs: WeightLogType[]): WeightAnalytics {
  const sorted = sortWeightLogsAsc(logs);
  if (sorted.length === 0) {
    return {
      currentWeight: null,
      startingWeight: null,
      totalChange: null,
      avg7d: null,
      avg30d: null,
      monthlyChange: null,
      trendStatus: null,
      lowest: null,
      highest: null,
      lastUpdatedLabel: null,
    };
  }

  const weights = sorted.map((l) => l.weight);
  const latest = sorted[sorted.length - 1];
  const first = sorted[0];
  const { monthlyDelta } = calculateWeightTrendDeltas(sorted);

  return {
    currentWeight: latest.weight,
    startingWeight: first.weight,
    totalChange: Math.round((latest.weight - first.weight) * 10) / 10,
    avg7d: averageOfLastN(weights, 7),
    avg30d: averageOfLastN(weights, 30),
    monthlyChange: monthlyDelta,
    trendStatus: getTrendStatus(monthlyDelta),
    lowest: Math.round(Math.min(...weights) * 10) / 10,
    highest: Math.round(Math.max(...weights) * 10) / 10,
    lastUpdatedLabel: formatWeightLastUpdated(latest.date),
  };
}

export function generateWeightInsights(analytics: WeightAnalytics, logs: WeightLogType[]): string[] {
  const insights: string[] = [];
  const sorted = sortWeightLogsAsc(logs);

  if (analytics.monthlyChange !== null && analytics.monthlyChange <= -0.2) {
    insights.push(`You lost ${Math.abs(analytics.monthlyChange).toFixed(1)} kg in the last 30 days.`);
  } else if (analytics.monthlyChange !== null && analytics.monthlyChange >= 0.2) {
    insights.push(`You gained ${analytics.monthlyChange.toFixed(1)} kg in the last 30 days.`);
  }

  if (analytics.trendStatus === "stable" && sorted.length >= 3) {
    insights.push("Your weight has remained stable this week.");
  }

  if (
    analytics.currentWeight !== null &&
    analytics.avg30d !== null &&
    analytics.currentWeight < analytics.avg30d - 0.3
  ) {
    insights.push("You are trending downward compared to your 30-day average.");
  } else if (
    analytics.currentWeight !== null &&
    analytics.avg30d !== null &&
    analytics.currentWeight > analytics.avg30d + 0.3
  ) {
    insights.push("You are trending upward compared to your 30-day average.");
  }

  if (sorted.length >= 14) {
    const last7 = sorted.slice(-7).map((l) => l.weight);
    const prev7 = sorted.slice(-14, -7).map((l) => l.weight);
    const avgLast7 = averageOfLastN(last7, 7);
    const avgPrev7 = averageOfLastN(prev7, 7);
    if (avgLast7 !== null && avgPrev7 !== null) {
      const delta = Math.round((avgLast7 - avgPrev7) * 10) / 10;
      if (delta <= -0.3) {
        insights.push("Your 7-day average is lower than last week.");
      } else if (delta >= 0.3) {
        insights.push("Your 7-day average is higher than last week.");
      }
    }
  }

  return insights.slice(0, 4);
}

export const WEIGHT_UNIT = "kg" as const;
export const WEIGHT_MIN_KG = 20;
export const WEIGHT_MAX_KG = 300;

export function validateWeightInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Weight is required";
  const w = parseFloat(trimmed);
  if (Number.isNaN(w)) return "Enter a valid number";
  if (w < WEIGHT_MIN_KG || w > WEIGHT_MAX_KG) return `Weight must be between ${WEIGHT_MIN_KG} and ${WEIGHT_MAX_KG} kg`;
  return null;
}
