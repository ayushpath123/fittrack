import { prisma } from "@/lib/prisma";
import { endOfDay, getDaysAgo, startOfDay, toLocalDateKey } from "@/lib/date";
import { mealLoggingStreakFromDayKeys } from "@/lib/meal-logging-streak";
import { HydrationWidget } from "@/components/HydrationWidget";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, Dumbbell, Scale, Sparkles, Utensils, ChevronRight } from "lucide-react";
import { WelcomeTips } from "@/components/WelcomeTips";
import { requireUserId } from "@/lib/auth";
import { RingProgress } from "@/components/RingProgress";

function inTimeRangeMs(date: Date, from: Date, to: Date) {
  const t = date.getTime();
  return t >= from.getTime() && t <= to.getTime();
}

export default async function DashboardPage() {
  const userId = await requireUserId();
  const today = new Date();
  const dayStart = startOfDay(today);
  const hour = today.getHours();
  const weekStart = getDaysAgo(6);
  const prevWeekStart = startOfDay(getDaysAgo(13));
  const prevWeekEnd = endOfDay(getDaysAgo(7));
  const [
    meals,
    goals,
    hydrationToday,
    fortnightMeals,
    fortnightWorkouts,
    fortnightHydration,
    monthMeals,
    streakMeals,
    recentWeightLogs,
  ] = await Promise.all([
    prisma.mealEntry.findMany({ where: { userId, date: { gte: dayStart, lte: endOfDay(today) } } }),
    prisma.goalSetting.findUnique({ where: { userId } }),
    prisma.hydrationLog.findUnique({ where: { userId_date: { userId, date: dayStart } } }),
    prisma.mealEntry.findMany({ where: { userId, date: { gte: prevWeekStart, lte: endOfDay(today) } } }),
    prisma.workout.findMany({
      where: { userId, date: { gte: prevWeekStart, lte: endOfDay(today) }, completed: true },
    }),
    prisma.hydrationLog.findMany({ where: { userId, date: { gte: prevWeekStart, lte: endOfDay(today) } } }),
    prisma.mealEntry.findMany({ where: { userId, date: { gte: getDaysAgo(30) } }, orderBy: { date: "asc" } }),
    prisma.mealEntry.findMany({
      where: { userId, date: { gte: getDaysAgo(400) } },
      select: { date: true },
    }),
    prisma.weightLog.findMany({ where: { userId }, orderBy: { date: "desc" }, take: 45 }),
  ]);

  const weekMeals = fortnightMeals.filter((m) => inTimeRangeMs(new Date(m.date), weekStart, endOfDay(today)));
  const prevWeekMeals = fortnightMeals.filter((m) => inTimeRangeMs(new Date(m.date), prevWeekStart, prevWeekEnd));
  const weekWorkouts = fortnightWorkouts.filter((w) => inTimeRangeMs(new Date(w.date), weekStart, endOfDay(today)));
  const prevWeekWorkouts = fortnightWorkouts.filter((w) => inTimeRangeMs(new Date(w.date), prevWeekStart, prevWeekEnd));
  const weekHydration = fortnightHydration.filter((h) => inTimeRangeMs(new Date(h.date), weekStart, endOfDay(today)));

  const CALORIE_TARGET = goals?.calorieTarget ?? 1500;
  if (!goals) redirect("/onboarding");

  const PROTEIN_TARGET = goals?.proteinTarget ?? 110;
  const CARB_TARGET = goals?.carbTarget ?? 180;
  // const FAT_TARGET = goals?.fatTarget ?? 55;
  const WATER_GOAL_ML = goals?.waterTargetMl ?? 2000;

  const totalCalories = meals.reduce((s, m) => s + m.totalCalories, 0);
  const totalProtein = meals.reduce((s, m) => s + m.totalProtein, 0);
  const totalCarbs = meals.reduce((s, m) => s + (m.totalCarbs ?? 0), 0);
  // const totalFat = meals.reduce((s, m) => s + (m.totalFat ?? 0), 0);
  const remaining = CALORIE_TARGET - totalCalories;
  const caloriePercent = Math.min(100, Math.round((totalCalories / CALORIE_TARGET) * 100));

  const streakLoggedDays = new Set(streakMeals.map((m) => toLocalDateKey(new Date(m.date))));
  const streak = mealLoggingStreakFromDayKeys(streakLoggedDays);
  const adherence = monthMeals.length
    ? Math.round((monthMeals.filter((m) => m.totalCalories <= CALORIE_TARGET).length / monthMeals.length) * 100)
    : 0;

  const weekMealDays = new Set(weekMeals.map((m) => toLocalDateKey(new Date(m.date)))).size;
  const weekCaloriesByDay = weekMeals.reduce((acc, m) => {
    const key = toLocalDateKey(new Date(m.date));
    acc.set(key, (acc.get(key) ?? 0) + m.totalCalories);
    return acc;
  }, new Map<string, number>());
  const underTargetCount = Array.from(weekCaloriesByDay.values()).filter((total) => total <= CALORIE_TARGET).length;
  const avgWeekHydration = weekHydration.length
    ? Math.round(weekHydration.reduce((sum, row) => sum + row.totalMl, 0) / weekHydration.length)
    : 0;

  const calThisWeek = weekMeals.reduce((s, m) => s + m.totalCalories, 0);
  const calPrevWeek = prevWeekMeals.reduce((s, m) => s + m.totalCalories, 0);
  const calWeekDelta = calThisWeek - calPrevWeek;
  const workoutWeekDelta = weekWorkouts.length - prevWeekWorkouts.length;

  let weightDelta: number | null = null;
  let weightDeltaNote: "7d" | "last_log" | null = null;
  if (recentWeightLogs.length >= 1) {
    const latestW = recentWeightLogs[0];
    const weekCutoff = endOfDay(getDaysAgo(7)).getTime();
    const baseline7d = recentWeightLogs.find((w) => new Date(w.date).getTime() <= weekCutoff);
    if (baseline7d && baseline7d.id !== latestW.id) {
      weightDelta = latestW.weight - baseline7d.weight;
      weightDeltaNote = "7d";
    } else if (recentWeightLogs.length >= 2) {
      weightDelta = recentWeightLogs[0].weight - recentWeightLogs[1].weight;
      weightDeltaNote = "last_log";
    }
  }

  type Nudge = { id: string; text: string; href?: string };
  const nudges: Nudge[] = [];
  if (meals.length === 0 && streak > 0) {
    nudges.push({ id: "streak", text: `Keep your ${streak}-day streak — log anything you ate today.`, href: "/meals?action=log" });
  } else if (meals.length === 0) {
    nudges.push({ id: "start", text: "Log your first meal today to see macros fill in.", href: "/meals?action=log" });
  }
  if ((hydrationToday?.totalMl ?? 0) < WATER_GOAL_ML * 0.35 && hour >= 10) {
    nudges.push({ id: "water", text: "Hydration is behind your goal — add a glass.", href: "/dashboard" });
  }
  if (remaining < -120) {
    nudges.push({ id: "over", text: "You're above today's calorie target. Balance with lighter choices tomorrow." });
  }
  if (remaining > 220 && hour >= 17 && hour <= 21) {
    nudges.push({ id: "room", text: "Room for a satisfying dinner within target.", href: "/meals?action=log" });
  }
  if (totalProtein < PROTEIN_TARGET * 0.45 && meals.length > 0 && hour >= 13) {
    nudges.push({ id: "protein", text: "Protein is low — lean meat, yogurt, or tofu helps close the gap.", href: "/meals?action=log" });
  }
  if (weekWorkouts.length === 0 && [0, 6].includes(today.getDay()) && hour >= 9) {
    nudges.push({ id: "weekend-move", text: "Weekend check-in: even a 15-min workout keeps momentum.", href: "/workout?action=start" });
  }
  const personalizedNudges = nudges.slice(0, 3);

  const weeklyPlan = [
    weekMealDays < 5 ? { title: "Log meals more consistently", desc: `${weekMealDays}/7 days logged this week. Aim for 5+.`, href: "/meals?action=log", cta: "Log meal" } : null,
    underTargetCount < 4 ? { title: "Tighten calorie adherence", desc: `${underTargetCount} days met target this week.`, href: "/meals", cta: "View meals" } : null,
    weekWorkouts.length < 3 ? { title: "Complete 3 workouts this week", desc: `${weekWorkouts.length}/3 workouts done.`, href: "/workout?action=start", cta: "Start workout" } : null,
    avgWeekHydration < WATER_GOAL_ML ? { title: "Boost hydration", desc: `${avgWeekHydration}ml avg vs ${WATER_GOAL_ML}ml goal.`, href: "/dashboard", cta: "Add water" } : null,
  ].filter((item): item is { title: string; desc: string; href: string; cta: string } => !!item).slice(0, 3);

  return (
    <div className="flex min-h-[calc(100dvh-var(--app-header-h)-var(--app-bottom-nav-h)-1.25rem)] flex-col pb-1">
      <WelcomeTips />

      {/* ── Header ── */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="h-1.5 w-1.5 rounded-full bg-[var(--green)]"
            style={{ boxShadow: "0 0 8px rgba(45,212,160,.35)" }}
          />
          <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--muted)]">
            {today.toLocaleDateString("en", { weekday: "long", day: "numeric", month: "short" })}
          </p>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-[var(--white)] num">
          Good tracking,{" "}
          <span className="grad-blue-purple">keep going</span>
        </h1>
      </div>

      {/* ── Quick actions ── */}
      <div className="mb-3 grid grid-cols-3 gap-1.5 card-entrance staggered"
        style={{ ["--stagger-base" as string]: "0ms", ["--stagger-index" as string]: 1 }}>
        {[
          { href: "/meals?action=log", icon: Utensils, label: "Log meal" },
          { href: "/weight?action=log", icon: Scale, label: "Weight" },
          { href: "/workout?action=start", icon: Dumbbell, label: "Workout" },
        ].map(({ href, icon: Icon, label }) => (
          <Link
            key={label}
            href={href}
            className="premium-card flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 transition-transform active:scale-95"
          >
            <Icon size={15} className="text-[#BEFF47] shrink-0" />
            <span className="text-[11px] font-semibold text-[var(--white)]">{label}</span>
          </Link>
        ))}
      </div>

      {/* ── MACRO HERO CARD ── */}
      <div
        className="card-entrance staggered premium-card rounded-2xl p-4 mb-3"
        style={{ ["--stagger-base" as string]: "0ms", ["--stagger-index" as string]: 2 }}
      >
        {/* Calorie summary row */}
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)] mb-0.5">
              Today's nutrition
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="num text-2xl font-bold text-[var(--white)]">
                {Math.round(totalCalories)}
              </span>
              <span className="text-[11px] text-[var(--muted)]">/ {CALORIE_TARGET} kcal</span>
            </div>
          </div>
          <div className="text-right">
            <p className={`num text-base font-bold ${remaining >= 0 ? "text-[#2DD4A0]" : "text-[#FF5C7A]"}`}>
              {Math.abs(Math.round(remaining))} kcal
            </p>
            <p className="text-[10px] text-[var(--muted)]">{remaining >= 0 ? "remaining" : "over target"}</p>
          </div>
        </div>

        {/* Calorie progress bar */}
        <div className="mb-5 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${caloriePercent}%`,
              background: caloriePercent > 100
                ? "#FF5C7A"
                : caloriePercent > 80
                ? "#BEFF47"
                : "#1D4ED8",
            }}
          />
        </div>

        {/* Macro rings (fat ring omitted — keep three rings) */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <RingProgress
            value={totalCalories}
            target={CALORIE_TARGET}
            label="Calories"
            unit="kcal"
            color={totalCalories > 0 ? "#1D4ED8" : "#2563EB"}
            trackColor="#EFF6FF"
            delay={0}
          />
          <RingProgress
            value={totalProtein}
            target={PROTEIN_TARGET}
            label="Protein"
            unit="g"
            color={totalProtein > 0 ? "#15803D" : "#16A34A"}
            trackColor="#DCFCE7"
            delay={150}
          />
          <RingProgress
            value={totalCarbs}
            target={CARB_TARGET}
            label="Carbs"
            unit="g"
            color={totalCarbs > 0 ? "#D97706" : "#F59E0B"}
            trackColor="#FEF3C7"
            delay={300}
          />
          {/*
          <RingProgress
            value={totalFat}
            target={FAT_TARGET}
            label="Fat"
            unit="g"
            color={totalFat > 0 ? "#6D28D9" : "#7C3AED"}
            trackColor="#EDE9FE"
            delay={450}
          />
          */}
        </div>

        {/* Macro target labels */}
        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/[0.06] pt-3">
          {[
            { label: "Cal", val: totalCalories, target: CALORIE_TARGET, unit: "kcal" },
            { label: "Pro", val: totalProtein, target: PROTEIN_TARGET, unit: "g" },
            { label: "Carb", val: totalCarbs, target: CARB_TARGET, unit: "g" },
          ].map(({ label, val, target, unit }) => (
            <div key={label} className="text-center">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-[var(--muted)]">{label}</p>
              <p className="num mt-0.5 text-[11px] font-bold text-[var(--white)]">
                {Math.round(val)}<span className="font-normal text-[var(--muted)]">/{target}{unit}</span>
              </p>
            </div>
          ))}
        </div>

        {/* Log meal CTA if nothing logged */}
        {meals.length === 0 && (
          <Link
            href="/meals?action=log"
            className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-[rgba(190,255,71,.2)] bg-[rgba(190,255,71,.07)] py-2.5 text-[11px] font-semibold text-[#B8E86A] transition-transform active:scale-[0.99]"
          >
            <Utensils size={13} />
            Log your first meal to fill this in
          </Link>
        )}
      </div>

      {/* ── Stats row ── */}
      <div
        className="card-entrance staggered mb-3 grid grid-cols-4 gap-1.5"
        style={{ ["--stagger-base" as string]: "0ms", ["--stagger-index" as string]: 3 }}
      >
        <div className="premium-card flex flex-col items-center justify-center rounded-xl py-2.5 px-1 text-center">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-[var(--muted)]">Streak</p>
          <p className="num mt-1 text-sm font-bold text-[var(--white)]">{streak}d</p>
        </div>
        <div className="premium-card flex flex-col items-center justify-center rounded-xl py-2.5 px-1 text-center">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-[var(--muted)]">Adherence</p>
          <p className="num mt-1 text-sm font-bold text-[var(--white)]">{adherence}%</p>
        </div>
        <div className="premium-card flex flex-col items-center justify-center rounded-xl py-2.5 px-1 text-center">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-[var(--muted)]">Cal Δ</p>
          <p className="num mt-1 text-sm font-bold text-[var(--white)]">
            {calWeekDelta === 0 ? "—" : `${calWeekDelta > 0 ? "+" : ""}${Math.round(calWeekDelta)}`}
          </p>
        </div>
        <div className="premium-card flex flex-col items-center justify-center rounded-xl py-2.5 px-1 text-center">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-[var(--muted)]">
            {weightDeltaNote === "7d" ? "Wt 7d" : "Weight"}
          </p>
          {weightDelta === null ? (
            <p className="mt-1 text-sm font-bold text-[var(--muted)]">—</p>
          ) : (
            <p className="num mt-1 text-sm font-bold text-[var(--white)]">
              {weightDelta === 0
                ? "0.0"
                : `${weightDelta > 0 ? "+" : "−"}${Math.abs(weightDelta).toFixed(1)}`}
              <span className="text-[8px] font-normal text-[var(--muted)]">kg</span>
            </p>
          )}
        </div>
      </div>

      {/* ── AI Coach ── */}
      <Link
        href="/coach"
        className="card-entrance staggered mb-3 flex items-center gap-2 rounded-xl border border-[rgba(190,255,71,.22)] bg-[rgba(190,255,71,.08)] px-3.5 py-2.5 transition-transform active:scale-[0.99]"
        style={{ ["--stagger-base" as string]: "0ms", ["--stagger-index" as string]: 4 }}
      >
        <Sparkles size={14} className="text-[#BEFF47] shrink-0" />
        <span className="flex-1 text-[11px] font-semibold text-[#B8E86A]">Ask AI Coach</span>
        <ChevronRight size={13} className="text-[#B8E86A]/50" />
      </Link>

      {/* ── Hydration ── */}
      <div
        className="card-entrance staggered mb-3"
        style={{ ["--stagger-base" as string]: "0ms", ["--stagger-index" as string]: 5 }}
      >
        <HydrationWidget dateKey={toLocalDateKey(today)} goalMl={WATER_GOAL_ML} initialTotalMl={hydrationToday?.totalMl ?? 0} />
      </div>

      {/* ── Nudges ── */}
      {personalizedNudges.length > 0 && (
        <div
          className="card-entrance staggered mb-3 premium-card rounded-2xl p-3.5"
          style={{ ["--stagger-base" as string]: "0ms", ["--stagger-index" as string]: 6 }}
        >
          <div className="mb-2.5 flex items-center gap-2">
            <Bell size={13} className="text-[#B8E86A]" />
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">Nudges</p>
          </div>
          <ul className="space-y-2">
            {personalizedNudges.map((nudge) => (
              <li key={nudge.id} className="flex gap-2.5 border-l-2 border-[rgba(45,212,160,.4)] pl-2.5 text-[12px] leading-snug text-[var(--white)]">
                {nudge.href ? (
                  <Link href={nudge.href} className="hover:underline">{nudge.text}</Link>
                ) : (
                  <span>{nudge.text}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Weekly Plan ── */}
      {weeklyPlan.length > 0 && (
        <div
          className="card-entrance staggered premium-card rounded-2xl p-4"
          style={{ ["--stagger-base" as string]: "0ms", ["--stagger-index" as string]: 7 }}
        >
          <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">This week</p>
          <div className="space-y-2">
            {weeklyPlan.map((item) => (
              <div
                key={item.title}
                className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-[var(--white)] truncate">{item.title}</p>
                  <p className="mt-0.5 text-[10px] text-[var(--muted)]">{item.desc}</p>
                </div>
                <Link
                  href={item.href}
                  className="shrink-0 rounded-lg border border-[rgba(190,255,71,.28)] bg-[rgba(190,255,71,.1)] px-2.5 py-1 text-[10px] font-semibold text-[#B8E86A]"
                >
                  {item.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}