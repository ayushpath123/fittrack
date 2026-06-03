import { prisma } from "@/lib/prisma";
import { endOfDay, getDaysAgo, startOfDay, toLocalDateKey } from "@/lib/date";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart2, Calendar, ChevronRight, Footprints, Medal, Moon, Scale, Smartphone, Trophy } from "lucide-react";
import { requireUserIdForPage } from "@/lib/auth";
import { SectionHeader } from "@/components/SectionHeader";
import { buildLegacyGamificationSummary } from "@/lib/gamification-legacy";
import { buildActivityFeed } from "@/lib/activity-timeline";
import { DashboardActivityFeed } from "@/components/dashboard/DashboardActivityFeed";
import { mealLoggingStreakFromDayKeys } from "@/lib/meal-logging-streak";
import { rewardsUnlocked, REWARDS_UNLOCK_STREAK } from "@/lib/rewards-unlock";
import { Lock } from "lucide-react";

function inTimeRangeMs(date: Date, from: Date, to: Date) {
  const t = date.getTime();
  return t >= from.getTime() && t <= to.getTime();
}

export default async function ActivityPage() {
  const userId = await requireUserIdForPage();
  const today = new Date();
  const dayStart = startOfDay(today);
  const weekStart = getDaysAgo(6);
  const prevWeekStart = startOfDay(getDaysAgo(13));
  const since90 = getDaysAgo(90);

  const [
    goals,
    mealsToday,
    hydrationToday,
    fortnightMeals,
    monthMeals,
    meals90,
    workouts90,
    weightLogs90,
    hydration90,
    recentMealsT,
    recentWorkoutsT,
    recentWeightsT,
  ] = await Promise.all([
    prisma.goalSetting.findUnique({ where: { userId } }),
    prisma.mealEntry.findMany({ where: { userId, date: { gte: dayStart, lte: endOfDay(today) } } }),
    prisma.hydrationLog.findUnique({ where: { userId_date: { userId, date: dayStart } } }),
    prisma.mealEntry.findMany({ where: { userId, date: { gte: prevWeekStart, lte: endOfDay(today) } } }),
    prisma.mealEntry.findMany({ where: { userId, date: { gte: getDaysAgo(30) } }, orderBy: { date: "asc" } }),
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
      take: 18,
      select: { id: true, mealType: true, totalCalories: true, createdAt: true },
    }),
    prisma.workout.findMany({
      where: { userId, completed: true },
      orderBy: { updatedAt: "desc" },
      take: 18,
      select: { id: true, date: true, updatedAt: true },
    }),
    prisma.weightLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, weight: true, date: true, createdAt: true },
    }),
  ]);

  if (!goals) redirect("/onboarding");

  const CALORIE_TARGET = goals.calorieTarget;
  const PROTEIN_TARGET = goals.proteinTarget;
  const WATER_GOAL_ML = goals.waterTargetMl;

  const weekMeals = fortnightMeals.filter((m) => inTimeRangeMs(new Date(m.date), weekStart, endOfDay(today)));
  const weekMealDays = new Set(weekMeals.map((m) => toLocalDateKey(new Date(m.date)))).size;
  const rhythmPct = Math.round((weekMealDays / 7) * 100);

  const totalCalories = mealsToday.reduce((s, m) => s + m.totalCalories, 0);
  const totalProtein = mealsToday.reduce((s, m) => s + m.totalProtein, 0);
  const waterMl = hydrationToday?.totalMl ?? 0;
  const waterPct = Math.min(100, Math.round((waterMl / WATER_GOAL_ML) * 100));
  const proteinPct = Math.min(100, Math.round((totalProtein / PROTEIN_TARGET) * 100));
  const calorieOver = totalCalories > CALORIE_TARGET;
  const calScore = !calorieOver
    ? Math.min(100, Math.round((totalCalories / CALORIE_TARGET) * 100))
    : Math.max(35, 100 - Math.round(((totalCalories - CALORIE_TARGET) / CALORIE_TARGET) * 55));
  const readinessPct = Math.min(100, Math.round((calScore + proteinPct + waterPct) / 3));

  const adherence = monthMeals.length
    ? Math.round((monthMeals.filter((m) => m.totalCalories <= CALORIE_TARGET).length / monthMeals.length) * 100)
    : 0;

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
  const xpEarnedToday = summary.quests.filter((q) => q.completed).reduce((s, q) => s + q.rewardXp, 0);

  const timeline = buildActivityFeed(recentMealsT, recentWorkoutsT, recentWeightsT, {
    xpEarnedToday,
    limit: 24,
  });

  const mealLogStreak = mealLoggingStreakFromDayKeys(mealDays);
  const unlockRewards = rewardsUnlocked(mealLogStreak);

  const shortcuts = [
    { href: "/analytics", label: "Analytics", hint: "Trends & charts", icon: BarChart2 },
    { href: "/calendar", label: "Calendar", hint: "Day history", icon: Calendar },
    ...(unlockRewards
      ? ([
          { href: "/leaderboards", label: "Global ranks", hint: "Monthly XP ladder", icon: Medal },
          { href: "/game", label: "Arena", hint: "Quests & XP", icon: Trophy },
        ] as const)
      : []),
    { href: "/weight", label: "Weight", hint: "Scale trend", icon: Scale },
  ] as const;

  return (
    <div className="flex min-h-[calc(100dvh-var(--app-header-h)-var(--app-bottom-nav-h)-1.25rem)] flex-col pb-2">
      <SectionHeader
        className="mb-3"
        eyebrow="Extras"
        title="More"
        subtitle="Stats, game, calendar, and your full activity feed."
        action={
          <Link
            href="/dashboard"
            className="inline-flex min-h-9 items-center rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2 text-[11px] font-semibold text-[var(--white)]"
          >
            Home
          </Link>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className="premium-card rounded-2xl p-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">Rhythm</p>
          <p className="num mt-1 text-2xl font-bold text-[var(--white)]">{weekMealDays}/7</p>
          <p className="mt-1 text-[11px] text-[var(--muted)]">Distinct days with a meal log this week · {rhythmPct}%</p>
        </div>
        <div className="premium-card rounded-2xl p-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">Readiness</p>
          <p className="num mt-1 text-2xl font-bold text-[var(--white)]">{readinessPct}</p>
          <p className="mt-1 text-[11px] text-[var(--muted)]">Blend of today’s fuel, protein, and hydration</p>
        </div>
      </div>

      <div className="mb-2 px-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Wearables & recovery</p>
        <p className="mt-0.5 text-[11px] text-[var(--hint)]">Connect data here when integrations ship.</p>
      </div>
      <div className="mb-4 grid grid-cols-3 gap-2">
        {[
          { icon: Moon, label: "Sleep", hint: "Soon" },
          { icon: Footprints, label: "Steps", hint: "Soon" },
          { icon: Smartphone, label: "Sync", hint: "Soon" },
        ].map(({ icon: Icon, label, hint }) => (
          <div
            key={label}
            className="premium-card flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center opacity-[0.72]"
          >
            <Icon size={18} className="text-[var(--muted)]" aria-hidden />
            <span className="text-[11px] font-semibold text-[var(--white)]">{label}</span>
            <span className="text-[9px] font-medium uppercase tracking-wide text-[var(--hint)]">{hint}</span>
          </div>
        ))}
      </div>

      <div className="mb-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">Streak pulse</p>
        <p className="mt-1 text-[13px] font-semibold text-[var(--white)]">
          Global <span className="num text-[#FFB547]">{summary.globalStreak}d</span>
          <span className="mx-1.5 text-[var(--hint)]">·</span>
          Meals <span className="num">{summary.mealStreak}d</span>
          <span className="mx-1.5 text-[var(--hint)]">·</span>
          Training <span className="num">{summary.workoutStreak}d</span>
        </p>
      </div>

      {!unlockRewards ? (
        <div className="mb-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-3">
          <div className="flex gap-2">
            <Lock size={16} className="shrink-0 text-[var(--muted)]" aria-hidden />
            <div>
              <p className="text-xs font-semibold text-[var(--white)]">Rewards unlock soon</p>
              <p className="mt-0.5 text-[10px] text-[var(--muted)]">
                Log meals {REWARDS_UNLOCK_STREAK} days in a row to unlock Arena and leaderboards. Streak: {mealLogStreak}/
                {REWARDS_UNLOCK_STREAK}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mb-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Shortcuts</p>
        <div className="grid grid-cols-2 gap-2">
          {shortcuts.map(({ href, label, hint, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="premium-card flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-transform active:scale-[0.99]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
                <Icon size={16} className="text-[#BEFF47]" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-0.5 text-[12px] font-semibold text-[var(--white)]">
                  {label}
                  <ChevronRight size={12} className="shrink-0 text-[var(--hint)]" />
                </span>
                <span className="block text-[10px] text-[var(--muted)]">{hint}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>

      <DashboardActivityFeed items={timeline} />
    </div>
  );
}
