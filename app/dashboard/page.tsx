import { prisma } from "@/lib/prisma";
import { endOfDay, getDaysAgo, startOfDay, toLocalDateKey } from "@/lib/date";
import { mealLoggingStreakFromDayKeys } from "@/lib/meal-logging-streak";
import { HydrationWidget } from "@/components/HydrationWidget";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, Sparkles, ChevronRight } from "lucide-react";
import { WelcomeTips } from "@/components/WelcomeTips";
import { requireUserId } from "@/lib/auth";
import { InsightCallout } from "@/components/InsightCallout";
import { SectionHeader } from "@/components/SectionHeader";
import { buildLegacyGamificationSummary } from "@/lib/gamification-legacy";
import { syncLeaderboardAndGetStandings } from "@/lib/leaderboard";
import { DashboardHomeClient } from "@/components/dashboard/DashboardHomeClient";
import { buildActivityFeed } from "@/lib/activity-timeline";
import type { HeroRingSpec } from "@/components/dashboard/DashboardHeroRings";

function inTimeRangeMs(date: Date, from: Date, to: Date) {
  const t = date.getTime();
  return t >= from.getTime() && t <= to.getTime();
}

function nextRankTeaser(level: number): string | null {
  const tiers: { at: number; name: string }[] = [
    { at: 4, name: "Silver" },
    { at: 7, name: "Gold" },
    { at: 10, name: "Platinum" },
    { at: 14, name: "Diamond" },
    { at: 18, name: "Legend" },
  ];
  for (const tier of tiers) {
    if (level < tier.at) {
      const delta = tier.at - level;
      return `${delta} level${delta === 1 ? "" : "s"} to ${tier.name}`;
    }
  }
  return null;
}

export default async function DashboardPage() {
  const userId = await requireUserId();
  const today = new Date();
  const dayStart = startOfDay(today);
  const hour = today.getHours();
  const weekStart = getDaysAgo(6);
  const prevWeekStart = startOfDay(getDaysAgo(13));
  const prevWeekEnd = endOfDay(getDaysAgo(7));
  const since90 = getDaysAgo(90);

  const [
    meals,
    goals,
    hydrationToday,
    fortnightMeals,
    fortnightWorkouts,
    fortnightHydration,
    monthMeals,
    streakMeals,
    meals90,
    workouts90,
    weightLogs90,
    hydration90,
    recentMealsT,
    recentWorkoutsT,
    recentWeightsT,
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
    prisma.mealEntry.findMany({
      where: { userId, date: { gte: since90 } },
      select: { date: true, totalCalories: true },
    }),
    prisma.workout.findMany({
      where: { userId, date: { gte: since90 }, completed: true },
      select: { date: true },
    }),
    prisma.weightLog.findMany({
      where: { userId, date: { gte: since90 } },
      select: { date: true },
    }),
    prisma.hydrationLog.findMany({
      where: { userId, date: { gte: since90 }, totalMl: { gt: 0 } },
      select: { date: true },
    }),
    prisma.mealEntry.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, mealType: true, totalCalories: true, createdAt: true },
    }),
    prisma.workout.findMany({
      where: { userId, completed: true },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: { id: true, date: true, updatedAt: true },
    }),
    prisma.weightLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, weight: true, date: true, createdAt: true },
    }),
  ]);

  const weekMeals = fortnightMeals.filter((m) => inTimeRangeMs(new Date(m.date), weekStart, endOfDay(today)));
  const prevWeekMeals = fortnightMeals.filter((m) => inTimeRangeMs(new Date(m.date), prevWeekStart, prevWeekEnd));
  const weekWorkouts = fortnightWorkouts.filter((w) => inTimeRangeMs(new Date(w.date), weekStart, endOfDay(today)));
  const weekHydration = fortnightHydration.filter((h) => inTimeRangeMs(new Date(h.date), weekStart, endOfDay(today)));

  const CALORIE_TARGET = goals?.calorieTarget ?? 1500;
  if (!goals) redirect("/onboarding");

  const PROTEIN_TARGET = goals?.proteinTarget ?? 110;
  const WATER_GOAL_ML = goals?.waterTargetMl ?? 2000;

  const totalCalories = meals.reduce((s, m) => s + m.totalCalories, 0);
  const totalProtein = meals.reduce((s, m) => s + m.totalProtein, 0);
  const remaining = CALORIE_TARGET - totalCalories;
  const caloriePctToGoal = Math.min(100, Math.round((totalCalories / CALORIE_TARGET) * 100));
  const calorieOver = totalCalories > CALORIE_TARGET;

  const streakLoggedDays = new Set(streakMeals.map((m) => toLocalDateKey(new Date(m.date))));
  const streak = mealLoggingStreakFromDayKeys(streakLoggedDays);
  const adherence = monthMeals.length
    ? Math.round((monthMeals.filter((m) => m.totalCalories <= CALORIE_TARGET).length / monthMeals.length) * 100)
    : 0;
  const waterMl = hydrationToday?.totalMl ?? 0;
  const waterPct = Math.min(100, Math.round((waterMl / WATER_GOAL_ML) * 100));

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

  void prevWeekMeals;

  const mealDays = new Set(meals90.map((row) => toLocalDateKey(new Date(row.date))));
  const workoutDays = new Set(workouts90.map((row) => toLocalDateKey(new Date(row.date))));
  const weightDays = new Set(weightLogs90.map((row) => toLocalDateKey(new Date(row.date))));
  const hydrationDays = new Set(hydration90.map((row) => toLocalDateKey(new Date(row.date))));
  const hydrationGoalHitToday = waterMl >= WATER_GOAL_ML;
  const summary = buildLegacyGamificationSummary({
    mealDays,
    workoutDays,
    weightDays,
    hydrationDays,
    adherence,
    hydrationGoalHitToday,
  });

  const leaderboardStandings = await syncLeaderboardAndGetStandings(prisma, userId, summary.xp);

  const xpEarnedToday = summary.quests.filter((q) => q.completed).reduce((s, q) => s + q.rewardXp, 0);
  const weeklyConsistencyPct = Math.round((weekMealDays / 7) * 100);
  const trainingWeeklyTarget = 3;
  const proteinPct = Math.min(100, Math.round((totalProtein / PROTEIN_TARGET) * 100));

  const rings: HeroRingSpec[] = [
    {
      id: "fuel",
      label: "Fuel",
      centerValue: Math.round(totalCalories).toLocaleString(),
      centerUnit: "kcal",
      pct: calorieOver ? 100 : caloriePctToGoal,
      gradientFrom: "#3B82F6",
      gradientTo: "#60A5FA",
      overAccent: calorieOver,
    },
    {
      id: "protein",
      label: "Protein",
      centerValue: `${Math.round(totalProtein)}`,
      centerUnit: `g / ${PROTEIN_TARGET}`,
      pct: proteinPct,
      gradientFrom: "#16A34A",
      gradientTo: "#4ADE80",
    },
    {
      id: "hydration",
      label: "Hydration",
      centerValue: `${Math.round(waterMl)}`,
      centerUnit: `ml / ${WATER_GOAL_ML}`,
      pct: waterPct,
      gradientFrom: "#0284C7",
      gradientTo: "#38BDF8",
    },
  ];

  const teasers: string[] = [];
  const rankLine = nextRankTeaser(summary.level);
  if (rankLine) teasers.push(rankLine);
  if (weekWorkouts.length < trainingWeeklyTarget) {
    const left = trainingWeeklyTarget - weekWorkouts.length;
    teasers.push(`${left} workout${left === 1 ? "" : "s"} to weekly training goal`);
  }
  if (summary.globalStreak < 7 && summary.globalStreak > 0) {
    teasers.push(`${7 - summary.globalStreak} more day${7 - summary.globalStreak === 1 ? "" : "s"} for a 7-day streak`);
  }
  teasers.push(`${adherence}% on-target meals (30d)`);
  if (teasers.length > 4) teasers.length = 4;
  if (!teasers.length) {
    teasers.push("Complete daily quests in Arena to stack XP");
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

  const timeline = buildActivityFeed(recentMealsT, recentWorkoutsT, recentWeightsT, {
    xpEarnedToday,
    limit: 12,
  });

  return (
    <div className="flex min-h-[calc(100dvh-var(--app-header-h)-var(--app-bottom-nav-h)-1.25rem)] flex-col pb-1">
      <WelcomeTips />

      <SectionHeader
        className="mb-3"
        eyebrow={today.toLocaleDateString("en", { weekday: "long", day: "numeric", month: "short" })}
        title="Today"
        subtitle={personalizedNudges[0]?.text ?? "Log a meal or a quick workout."}
        action={
          <Link
            href={personalizedNudges[0]?.href ?? "/meals?action=log"}
            className="inline-flex min-h-9 items-center rounded-xl bg-[#BEFF47] px-3 py-2 text-[11px] font-semibold text-[#06080A]"
          >
            Take action
          </Link>
        }
      />

      <DashboardHomeClient
        rings={rings}
        compete={{
          globalStreak: summary.globalStreak,
          xp: summary.xp,
          rank: summary.rank,
          level: summary.level,
          xpEarnedToday,
          weeklyConsistencyPct,
          badges: summary.badges,
          leaderboard: leaderboardStandings
            ? {
                globalRank: leaderboardStandings.globalRank,
                totalRanked: leaderboardStandings.totalRanked,
                percentile: leaderboardStandings.percentile,
                seasonKey: leaderboardStandings.seasonKey,
              }
            : null,
        }}
        teasers={teasers}
        timeline={timeline}
      />

      <div
        className="card-entrance staggered mb-3"
        style={{ ["--stagger-base" as string]: "0ms", ["--stagger-index" as string]: 5 }}
      >
        <HydrationWidget dateKey={toLocalDateKey(today)} goalMl={WATER_GOAL_ML} initialTotalMl={hydrationToday?.totalMl ?? 0} />
      </div>

      {(personalizedNudges.length > 0 || weeklyPlan.length > 0) && (
        <div
          className="card-entrance staggered mb-3 premium-card rounded-2xl p-3.5"
          style={{ ["--stagger-base" as string]: "0ms", ["--stagger-index" as string]: 6 }}
        >
          <div className="mb-2.5 flex items-center gap-2">
            <Bell size={13} className="text-[#B8E86A]" />
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">Focus this week</p>
          </div>
          <ul className="space-y-2">
            {[...personalizedNudges.map((nudge) => ({ text: nudge.text, href: nudge.href })), ...weeklyPlan.map((item) => ({ text: `${item.title} — ${item.desc}`, href: item.href }))].slice(0, 1).map((row, idx) => (
              <li key={`${row.text}-${idx}`} className="flex gap-2.5 border-l-2 border-[rgba(45,212,160,.4)] pl-2.5 text-[12px] leading-snug text-[var(--white)]">
                {row.href ? (
                  <Link href={row.href} className="hover:underline">{row.text}</Link>
                ) : (
                  <span>{row.text}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!personalizedNudges.length && (
        <InsightCallout
          title="Solid consistency"
          body="You are on track today. Keep the streak by checking in once more this evening."
        />
      )}

      {personalizedNudges.length === 0 && weeklyPlan.length === 0 ? (
        <Link
          href="/coach"
          className="card-entrance staggered mb-1 flex min-h-11 items-center gap-2 rounded-xl border border-[rgba(190,255,71,.22)] bg-[rgba(190,255,71,.08)] px-3.5 py-2.5 transition-transform active:scale-[0.99]"
          style={{ ["--stagger-base" as string]: "0ms", ["--stagger-index" as string]: 7 }}
        >
          <Sparkles size={14} className="text-[#BEFF47] shrink-0" />
          <span className="flex-1 text-[11px] font-semibold text-[#B8E86A]">Ask AI Coach</span>
          <ChevronRight size={13} className="text-[#B8E86A]/50" />
        </Link>
      ) : null}
    </div>
  );
}
