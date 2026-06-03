import { prisma } from "@/lib/prisma";
import { endOfDay, getDaysAgo, startOfDay, toLocalDateKey } from "@/lib/date";
import { mealLoggingStreakFromDayKeys } from "@/lib/meal-logging-streak";
import { getRecommendedPreset } from "@/lib/meal-templates";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUserIdForPage } from "@/lib/auth";
import { SectionHeader } from "@/components/SectionHeader";
import { DashboardHomeClient } from "@/components/dashboard/DashboardHomeClient";
import type { WeightLogType } from "@/types";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const userId = await requireUserIdForPage();
  const sp = await searchParams;
  const today = new Date();
  const dayStart = startOfDay(today);
  const todayKey = toLocalDateKey(today);

  const [meals, goals, hydrationToday, streakMeals, weightLogs7d] = await Promise.all([
    prisma.mealEntry.findMany({ where: { userId, date: { gte: dayStart, lte: endOfDay(today) } } }),
    prisma.goalSetting.findUnique({ where: { userId } }),
    prisma.hydrationLog.findUnique({ where: { userId_date: { userId, date: dayStart } } }),
    prisma.mealEntry.findMany({
      where: { userId, date: { gte: getDaysAgo(400) } },
      select: { date: true },
    }),
    prisma.weightLog.findMany({
      where: { userId, date: { gte: getDaysAgo(6) } },
      orderBy: { date: "asc" },
      select: { id: true, weight: true, date: true, waistCm: true },
    }),
  ]);

  if (!goals) redirect("/onboarding");

  const targets = {
    calories: goals.calorieTarget,
    protein: goals.proteinTarget,
    carbs: goals.carbTarget,
    fat: goals.fatTarget,
  };

  const totals = {
    calories: meals.reduce((s, m) => s + m.totalCalories, 0),
    protein: meals.reduce((s, m) => s + m.totalProtein, 0),
    carbs: meals.reduce((s, m) => s + (m.totalCarbs ?? 0), 0),
    fat: meals.reduce((s, m) => s + (m.totalFat ?? 0), 0),
  };

  const remaining = Math.round(targets.calories - totals.calories);
  const streakLoggedDays = new Set(streakMeals.map((m) => toLocalDateKey(new Date(m.date))));
  const streak = mealLoggingStreakFromDayKeys(streakLoggedDays);
  const mealsLoggedToday = meals.length > 0;
  const weightLoggedToday = weightLogs7d.some((l) => toLocalDateKey(new Date(l.date)) === todayKey);
  const weightLogsForHome: WeightLogType[] = weightLogs7d.map((l) => ({
    id: l.id,
    date: l.date.toISOString(),
    weight: l.weight,
    waistCm: l.waistCm,
  }));

  const recommendedTemplate = getRecommendedPreset(targets, today.getHours());

  let subtitle =
    remaining > 0
      ? `${remaining} kcal left · ${Math.round(totals.protein)}g protein logged`
      : "At or above calorie target for today";
  if (!mealsLoggedToday) {
    subtitle = streak > 0 ? `${streak}-day streak — log today in one tap.` : "Tap the green button to log your first meal.";
  }

  return (
    <div className="flex min-h-[calc(100dvh-var(--app-header-h)-var(--app-bottom-nav-h)-1.25rem)] flex-col pb-1">
      <SectionHeader
        className="mb-3"
        eyebrow={today.toLocaleDateString("en", { weekday: "long", day: "numeric", month: "short" })}
        title="Today"
        subtitle={subtitle}
        action={
          <Link
            href={`/meals?slot=${recommendedTemplate.mealType}`}
            className="inline-flex min-h-9 items-center rounded-xl bg-[#BEFF47] px-3 py-2 text-[11px] font-semibold text-[#06080A]"
          >
            Log food
          </Link>
        }
      />

      <DashboardHomeClient
        targets={targets}
        totals={totals}
        recommendedTemplate={recommendedTemplate}
        streak={streak}
        mealsLoggedToday={mealsLoggedToday}
        weightLogs={weightLogsForHome}
        weightLoggedToday={weightLoggedToday}
        dateKey={todayKey}
        waterGoalMl={goals.waterTargetMl ?? 2000}
        initialWaterMl={hydrationToday?.totalMl ?? 0}
        showWelcome={sp.welcome === "1"}
      />
    </div>
  );
}
