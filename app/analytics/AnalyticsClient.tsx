"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Flame, Target, TrendingDown, Trophy } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonCard } from "@/components/SkeletonCard";
import { toLocalDateKey } from "@/lib/date";

type WeeklyRow = {
  weekStart: string;
  label: string;
  avgDailyCalories: number;
  avgDailyProtein: number;
  avgDailyCarbs: number;
  avgDailyFat: number;
  loggedDays: number;
  workoutCount: number;
};

type AnalyticsPayload = {
  range: "7d" | "30d" | "90d";
  targets: { calorieTarget: number; proteinTarget: number; carbTarget: number; fatTarget: number };
  summary: {
    avgCalories: number;
    avgProtein: number;
    avgCarbs: number;
    avgFat: number;
    adherence: number;
    adherence7d: number;
    adherence30d: number;
    projectedFatLoss: number;
    workoutCount: number;
    weightTrend: { weeklyDelta: number; monthlyDelta: number };
  };
  charts: {
    weekly: WeeklyRow[];
    daily: { date: string; label: string; calories: number; protein: number; carbs: number; fat: number; workoutCount: number; steps: number }[];
    weightSeries: { id: string; date: string; weight: number }[];
  };
  insights: { text: string; confidence: "low" | "medium" | "high"; hint?: string }[];
};

type StatsView = "daily" | "weekly" | "monthly";
const viewToRange: Record<StatsView, "7d" | "30d" | "90d"> = {
  daily: "7d",
  weekly: "30d",
  monthly: "90d",
};

function parseView(value: string | null): StatsView {
  if (value === "daily" || value === "weekly" || value === "monthly") return value;
  return "weekly";
}

const CHART_GRID = "rgba(255,255,255,.05)";
type GraphType = "calories" | "protein" | "weight" | "workout" | "steps";

type GraphPoint = {
  date: string;
  label: string;
  calories: number | null;
  protein: number | null;
  weight: number | null;
  workout: number | null;
  steps: number | null;
  sampleSize?: number;
  isWeakSample?: boolean;
};

const graphConfig: Record<GraphType, { label: string; color: string; dataKey: keyof GraphPoint; unit: string }> = {
  calories: { label: "Calories Intake", color: "#FF6B6B", dataKey: "calories", unit: "kcal" },
  protein: { label: "Protein Intake", color: "#4ECDC4", dataKey: "protein", unit: "g" },
  weight: { label: "Weight Progress", color: "#5D5FEF", dataKey: "weight", unit: "kg" },
  workout: { label: "Workout Duration", color: "#FFA94D", dataKey: "workout", unit: "sessions" },
  steps: { label: "Steps Count", color: "#82C91E", dataKey: "steps", unit: "steps" },
};

export function AnalyticsClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [view, setView] = useState<StatsView>("weekly");
  const [showDeepStats, setShowDeepStats] = useState(false);
  const [selectedGraph, setSelectedGraph] = useState<GraphType>("calories");
  const [weekViewType, setWeekViewType] = useState<"pattern" | "week">("pattern");
  const [selectedDate, setSelectedDate] = useState<string>(() => toLocalDateKey(new Date()));
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const range = viewToRange[view];

  useEffect(() => {
    const fromUrl = parseView(searchParams.get("view"));
    if (fromUrl !== view) setView(fromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    const current = parseView(searchParams.get("view"));
    if (current === view) return;
    const next = new URLSearchParams(searchParams.toString());
    next.set("view", view);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [view, searchParams, router, pathname]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/analytics/summary?range=${range}`, { credentials: "include" });
      if (!res.ok) {
        if (mounted) setError("Could not load analytics.");
        setLoading(false);
        return;
      }
      const payload = (await res.json()) as AnalyticsPayload;
      if (mounted) setData(payload);
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [range]);

  const weeklyChartData = useMemo(() => data?.charts.weekly ?? [], [data?.charts.weekly]);
  const clampPct = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

  const graphData = useMemo<GraphPoint[]>(() => {
    const toDateKey = (raw: string) => raw.slice(0, 10);
    const getMondayIndex = (rawDate: string) => {
      const dateKey = toDateKey(rawDate);
      const day = new Date(`${dateKey}T00:00:00`).getDay();
      if (!Number.isFinite(day)) return 0;
      return (day + 6) % 7;
    };
    const getWeekRange = (date: string) => {
      const base = new Date(`${date}T00:00:00`);
      const day = (base.getDay() + 6) % 7;
      const monday = new Date(base);
      monday.setDate(base.getDate() - day);
      return Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return d.toISOString().slice(0, 10);
      });
    };

    const weightSeries = data?.charts.weightSeries ?? [];
    const weightMap = new Map<string, number>();
    for (const w of weightSeries) {
      weightMap.set(toLocalDateKey(new Date(`${toDateKey(w.date)}T00:00:00`)), w.weight);
    }

    const dailyPoints: GraphPoint[] = (data?.charts.daily ?? []).map((d) => ({
      date: toDateKey(d.date),
      label: d.label,
      calories: d.calories,
      protein: d.protein,
      workout: d.workoutCount,
      weight: weightMap.get(toLocalDateKey(new Date(`${toDateKey(d.date)}T00:00:00`))) ?? null,
      steps: d.steps ?? null,
      sampleSize: 1,
      isWeakSample: false,
    }));

    if (view === "weekly") {
      const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      if (weekViewType === "week") {
        const dailyMap = new Map(dailyPoints.map((d) => [d.date, d]));
        return getWeekRange(selectedDate).map((date) => {
          const found = dailyMap.get(date);
          const label = weekdayLabels[getMondayIndex(date)];
          if (!found) {
            return {
              date,
              label,
              calories: null,
              protein: null,
              workout: null,
              weight: null,
              steps: null,
              sampleSize: 0,
              isWeakSample: false,
            };
          }
          return {
            ...found,
            label,
            sampleSize: 1,
            isWeakSample: false,
          };
        });
      }

      const buckets = weekdayLabels.map((label) => ({
        label,
        caloriesTotal: 0,
        caloriesCount: 0,
        proteinTotal: 0,
        proteinCount: 0,
        weightTotal: 0,
        weightCount: 0,
        workoutTotal: 0,
        workoutCount: 0,
        stepsTotal: 0,
        stepsCount: 0,
      }));
      for (const p of dailyPoints) {
        const mondayFirstIndex = getMondayIndex(p.date);
        const b = buckets[mondayFirstIndex];
        if (p.calories != null) {
          b.caloriesTotal += p.calories;
          b.caloriesCount += 1;
        }
        if (p.protein != null) {
          b.proteinTotal += p.protein;
          b.proteinCount += 1;
        }
        if (p.weight != null) {
          b.weightTotal += p.weight;
          b.weightCount += 1;
        }
        if (p.workout != null) {
          b.workoutTotal += p.workout;
          b.workoutCount += 1;
        }
        if (p.steps != null) {
          b.stepsTotal += p.steps;
          b.stepsCount += 1;
        }
      }
      return buckets.map((b) => ({
        date: b.label,
        label: b.label,
        calories: b.caloriesCount === 0 ? null : b.caloriesTotal / b.caloriesCount,
        protein: b.proteinCount === 0 ? null : b.proteinTotal / b.proteinCount,
        workout: b.workoutTotal,
        weight: b.weightCount === 0 ? null : b.weightTotal / b.weightCount,
        steps: b.stepsTotal,
        sampleSize: b.caloriesCount,
        isWeakSample: b.caloriesCount > 0 && b.caloriesCount < 2,
      }));
    }

    if (view === "daily") return dailyPoints.slice(-7);

    const weeklyPoints: GraphPoint[] = weeklyChartData.map((w) => ({
      date: w.weekStart,
      label: w.label,
      calories: w.avgDailyCalories,
      protein: w.avgDailyProtein,
      workout: w.workoutCount,
      weight: null,
      steps: null,
      sampleSize: 1,
      isWeakSample: false,
    }));
    for (const p of weeklyPoints) {
      p.weight = dailyPoints
        .filter((d) => d.date.slice(0, 10) >= p.date.slice(0, 10))
        .slice(0, 1)
        .reduce((acc, x) => acc + (x.weight ?? 0), 0);
    }
    return weeklyPoints;
  }, [data?.charts.daily, data?.charts.weightSeries, view, weeklyChartData, weekViewType, selectedDate]);

  const activeConfig = graphConfig[selectedGraph];
  const formatXAxisTick = (value: string) => value;
  const validSeries = graphData
    .map((p) => Number(p[activeConfig.dataKey]))
    .filter((n): n is number => Number.isFinite(n) && n > 0);
  const hasSelectedData = validSeries.length > 0;
  const todayValue = hasSelectedData ? validSeries[validSeries.length - 1] : 0;
  const avg7 = hasSelectedData ? validSeries.slice(-7).reduce((a, b) => a + b, 0) / Math.min(7, validSeries.length) : 0;
  const prev7 = validSeries.length > 7 ? validSeries.slice(-14, -7).reduce((a, b) => a + b, 0) / Math.min(7, validSeries.slice(-14, -7).length) : 0;
  const changePct = prev7 > 0 ? ((avg7 - prev7) / prev7) * 100 : 0;
  const achievementBadges = useMemo(() => {
    if (!data) return [] as string[];
    const badges: string[] = [];
    if (data.summary.adherence >= 80) badges.push("Consistency streak");
    if (data.summary.avgProtein >= data.targets.proteinTarget) badges.push("Protein target hit");
    if (data.summary.avgCalories <= data.targets.calorieTarget) badges.push("Calorie control");
    if (data.summary.workoutCount / Math.max(1, (range === "90d" ? 90 : range === "7d" ? 7 : 30) / 7) >= 3) {
      badges.push("3x weekly training");
    }
    return badges;
  }, [data, range]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-9 w-40 rounded-xl bg-gray-200 animate-pulse dark:bg-slate-700" aria-hidden />
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
        <SkeletonCard lines={3} />
        <SkeletonCard lines={3} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <EmptyState title="Analytics unavailable" subtitle={error || "Please try again in a moment."} />
      </div>
    );
  }

  return (
    <div className="touch-manipulation space-y-4">
      <div>
        <h1 className="num text-2xl font-bold tracking-tight text-[var(--white)]">Analytics</h1>
        <p className="text-sm text-[var(--muted)]">Trends from your logs</p>
      </div>
      <div className="flex gap-2">
        <Link
          href="/weight"
          className="inline-flex min-h-10 items-center rounded-xl border border-[rgba(190,255,71,.32)] bg-[rgba(190,255,71,.12)] px-3 text-xs font-semibold text-[#B8E86A]"
        >
          Weight view
        </Link>
        <Link
          href="/calendar"
          className="inline-flex min-h-10 items-center rounded-xl border border-[rgba(255,255,255,.14)] bg-[rgba(255,255,255,.05)] px-3 text-xs font-semibold text-[var(--white)]"
        >
          Cal view
        </Link>
      </div>
      {achievementBadges.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {achievementBadges.map((badge) => (
            <span
              key={badge}
              className="rounded-full border border-[rgba(45,212,160,.35)] bg-[rgba(45,212,160,.14)] px-2.5 py-1 text-[10px] font-semibold text-[#6EECC4]"
            >
              {badge}
            </span>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        {[
          {
            label: "Adherence",
            value: `${data.summary.adherence}%`,
            sub: `7d ${data.summary.adherence7d}% · 30d ${data.summary.adherence30d}%`,
            icon: Trophy,
            tint: "rgba(45,212,160,.2)",
            iconColor: "#6EECC4",
            progress: clampPct(data.summary.adherence),
          },
          {
            label: "Avg calories/day",
            value: `${data.summary.avgCalories}`,
            sub: `Target ${data.targets.calorieTarget}`,
            icon: Flame,
            tint: "rgba(255,181,71,.2)",
            iconColor: "#FFCF80",
            progress: clampPct((data.summary.avgCalories / Math.max(1, data.targets.calorieTarget)) * 100),
          },
          {
            label: "Avg protein/day",
            value: `${data.summary.avgProtein}g`,
            sub: `Target ${data.targets.proteinTarget}g`,
            icon: Target,
            tint: "rgba(190,255,71,.2)",
            iconColor: "#B8E86A",
            progress: clampPct((data.summary.avgProtein / Math.max(1, data.targets.proteinTarget)) * 100),
          },
          {
            label: "Avg carbs/day",
            value: `${data.summary.avgCarbs}g`,
            sub: `Target ${data.targets.carbTarget}g`,
            icon: Target,
            tint: "rgba(255,181,71,.2)",
            iconColor: "#FFCF80",
            progress: clampPct((data.summary.avgCarbs / Math.max(1, data.targets.carbTarget)) * 100),
          },
          {
            label: "Avg fat/day",
            value: `${data.summary.avgFat}g`,
            sub: `Target ${data.targets.fatTarget}g`,
            icon: Target,
            tint: "rgba(167,139,250,.2)",
            iconColor: "#C4B5FD",
            progress: clampPct((data.summary.avgFat / Math.max(1, data.targets.fatTarget)) * 100),
          },
          {
            label: "Fat loss est.",
            value: `${data.summary.projectedFatLoss} kg`,
            sub: "~30d if deficit holds",
            icon: TrendingDown,
            tint: "rgba(45,212,160,.2)",
            iconColor: "#6EECC4",
            progress: clampPct(data.summary.projectedFatLoss * 20),
          },
        ].map((s, idx) => (
          <div
            key={s.label}
            className="premium-card card-entrance staggered min-h-[88px] rounded-2xl p-4"
            style={{ ["--stagger-base" as string]: "60ms", ["--stagger-index" as string]: idx }}
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium uppercase tracking-widest text-[var(--muted)]">{s.label}</p>
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg" style={{ background: s.tint }}>
                <s.icon size={13} color={s.iconColor} />
              </span>
            </div>
            <p className="metric-value mt-1 text-base font-bold tracking-tight text-[var(--white)]">{s.value}</p>
            {s.sub ? <p className="mt-1 text-[11px] leading-snug text-[var(--muted)]">{s.sub}</p> : null}
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[rgba(255,255,255,.08)]">
              <div className="h-full rounded-full" style={{ width: `${s.progress}%`, background: "linear-gradient(90deg,#BEFF47,#2DD4A0)" }} />
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setShowDeepStats((prev) => !prev)}
        className="w-full rounded-xl border border-[rgba(190,255,71,.32)] bg-[rgba(190,255,71,.12)] py-2.5 text-sm font-semibold text-[#B8E86A]"
      >
        {showDeepStats ? "Hide deep stats" : "Open deep stats"}
      </button>

      {showDeepStats ? (
        <>
          <div className="flex gap-0.5 rounded-xl p-1" role="tablist" aria-label="Analytics view" style={{ background: "rgba(255,255,255,.05)" }}>
            {([
              { id: "daily", label: "Daily" },
              { id: "weekly", label: "Weekly" },
              { id: "monthly", label: "Monthly" },
            ] as const).map((v) => (
              <button
                key={v.id}
                type="button"
                role="tab"
                aria-selected={view === v.id}
                onClick={() => setView(v.id)}
                className={`flex-1 min-h-11 rounded-[10px] py-1.5 text-sm font-medium transition-all ${
                  view === v.id
                    ? "bg-[rgba(190,255,71,.16)] font-semibold text-[#BEFF47]"
                    : "text-[var(--muted)] hover:text-[var(--white)]"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
          {view === "weekly" ? (
            <>
              <div className="flex gap-0.5 rounded-xl p-1" role="tablist" aria-label="Weekly mode type" style={{ background: "rgba(255,255,255,.05)" }}>
                {([
                  { id: "pattern", label: "Pattern" },
                  { id: "week", label: "Week" },
                ] as const).map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    role="tab"
                    aria-selected={weekViewType === mode.id}
                    onClick={() => setWeekViewType(mode.id)}
                    className={`flex-1 min-h-11 rounded-[10px] py-1.5 text-sm font-medium transition-all ${
                      weekViewType === mode.id
                        ? "bg-[rgba(190,255,71,.16)] font-semibold text-[#BEFF47]"
                        : "text-[var(--muted)] hover:text-[var(--white)]"
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-[var(--muted)]">
                {weekViewType === "pattern"
                  ? "Showing average behavior by weekday across selected range"
                  : "Showing actual data for selected week"}
              </p>
              {weekViewType === "week" ? (
                <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
                  <span>Week date</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="rounded-lg border border-[rgba(255,255,255,.14)] bg-[rgba(255,255,255,.05)] px-2 py-1 text-[var(--white)]"
                  />
                </label>
              ) : null}
            </>
          ) : null}
          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(Object.keys(graphConfig) as GraphType[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedGraph(key)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                  selectedGraph === key
                    ? "border-[rgba(190,255,71,.45)] bg-[rgba(190,255,71,.16)] text-[#B8E86A]"
                    : "border-[rgba(255,255,255,.14)] bg-[rgba(255,255,255,.05)] text-[var(--muted)]"
                }`}
              >
                {graphConfig[key].label.replace(" Intake", "").replace(" Progress", "")}
              </button>
            ))}
          </div>

          <div key={selectedGraph} className="premium-card rounded-2xl p-4" style={{ animation: "fade-slide-up .25s ease both" }}>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)]">{activeConfig.label}</p>
            <div className="mb-3 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-[rgba(255,255,255,.1)] bg-[rgba(255,255,255,.04)] px-2 py-1.5">
                <p className="text-[9px] uppercase tracking-wide text-[var(--muted)]">Today</p>
                <p className="num text-sm font-bold text-[var(--white)]">
                  {Math.round(todayValue)} {activeConfig.unit}
                </p>
              </div>
              <div className="rounded-xl border border-[rgba(255,255,255,.1)] bg-[rgba(255,255,255,.04)] px-2 py-1.5">
                <p className="text-[9px] uppercase tracking-wide text-[var(--muted)]">Avg (7d)</p>
                <p className="num text-sm font-bold text-[var(--white)]">
                  {Math.round(avg7)} {activeConfig.unit}
                </p>
              </div>
              <div className="rounded-xl border border-[rgba(255,255,255,.1)] bg-[rgba(255,255,255,.04)] px-2 py-1.5">
                <p className="text-[9px] uppercase tracking-wide text-[var(--muted)]">vs prev</p>
                <p className={`num text-sm font-bold ${changePct >= 0 ? "text-[#2DD4A0]" : "text-[#FF5C7A]"}`}>
                  {changePct >= 0 ? "+" : ""}
                  {Math.round(changePct)}%
                </p>
              </div>
            </div>
            {!hasSelectedData ? (
              <EmptyState title={`No ${activeConfig.label.toLowerCase()} data`} subtitle="Log more entries to unlock this chart." />
            ) : (
              <div className="h-[220px] w-full min-w-0 min-h-[220px] pt-1">
                <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                  <LineChart data={graphData} margin={{ top: 8, right: 8, left: 4, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10 }}
                      tickFormatter={formatXAxisTick}
                      interval="preserveStartEnd"
                      axisLine={false}
                      tickLine={false}
                      minTickGap={20}
                      tickMargin={10}
                      height={58}
                    />
                    <YAxis tick={{ fontSize: 10, fill: "rgba(244,244,255,.55)" }} width={42} axisLine={false} tickLine={false} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const value = Number(payload[0]?.value ?? 0);
                        return (
                          <div className="space-y-0.5 rounded-xl border px-2 py-1.5 text-xs" style={{ borderColor: "rgba(255,255,255,.10)", background: "#1C1C2C" }}>
                            <p className="font-medium text-[var(--white)]">{label}</p>
                            <p className="text-[var(--muted)]">
                              {activeConfig.label}: <span className="font-semibold text-[var(--white)]">{Math.round(value)} {activeConfig.unit}</span>
                            </p>
                            {view === "weekly" && weekViewType === "pattern" ? (
                              <p className="text-[var(--muted)]">
                                Entries:{" "}
                                <span className="font-semibold text-[var(--white)]">
                                  {(payload[0]?.payload as GraphPoint | undefined)?.sampleSize ?? 0} days
                                </span>
                              </p>
                            ) : null}
                          </div>
                        );
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey={activeConfig.dataKey}
                      name={activeConfig.label}
                      stroke={activeConfig.color}
                      strokeWidth={2.5}
                      connectNulls={false}
                      dot={(props) => {
                        const point = (props as { payload?: GraphPoint }).payload;
                        const isWeak = view === "weekly" && weekViewType === "pattern" && point?.isWeakSample;
                        return (
                          <circle
                            cx={props.cx}
                            cy={props.cy}
                            r={3}
                            fill={activeConfig.color}
                            fillOpacity={isWeak ? 0.45 : 1}
                            stroke={activeConfig.color}
                            strokeOpacity={isWeak ? 0.45 : 1}
                          />
                        );
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

      <div className="premium-card card-entrance staggered rounded-2xl p-4" style={{ ["--stagger-base" as string]: "120ms", ["--stagger-index" as string]: 6 }}>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">Insights</p>
        <p className="mb-2 text-[11px] text-gray-500 dark:text-slate-400">Simple rules from your logging patterns—not a medical score.</p>
        <div className="space-y-2">
          {data.insights.map((i, idx) => (
            <div key={idx} className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 backdrop-blur-sm">
              <p className="text-sm leading-snug text-[var(--white)]">{i.text}</p>
              <p className="mt-1 text-[11px] text-[var(--muted)]">
                Confidence: {i.confidence}
                {i.hint ? ` · ${i.hint}` : ""}
              </p>
            </div>
          ))}
        </div>
      </div>
        </>
      ) : null}
    </div>
  );
}
