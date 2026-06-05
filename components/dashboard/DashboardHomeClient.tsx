"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FirstLogCelebration } from "@/components/FirstLogCelebration";
import { PushReminderOptIn } from "@/components/PushReminderOptIn";
import { AchievementSection } from "@/components/dashboard/AchievementSection";
import { ActivityTimeline } from "@/components/dashboard/ActivityTimeline";
import { FloatingQuickActions } from "@/components/dashboard/FloatingQuickActions";
import { HealthInsights } from "@/components/dashboard/HealthInsights";
import { HeroSection } from "@/components/dashboard/HeroSection";
import { MealQuickLog } from "@/components/dashboard/MealQuickLog";
import { ProgressOverview } from "@/components/dashboard/ProgressOverview";
import { TodayPlan } from "@/components/dashboard/TodayPlan";
import type { MacroSnapshot } from "@/lib/meal-templates";
import type { DashboardPayload } from "@/types/dashboard";

export function DashboardHomeClient({ payload }: { payload: DashboardPayload }) {
  const router = useRouter();
  const [dismissWelcome, setDismissWelcome] = useState(false);
  const [localTotals, setLocalTotals] = useState(payload.totals);
  const [displayStreak, setDisplayStreak] = useState(payload.streak);
  const [flameActive, setFlameActive] = useState(false);
  const [celebration, setCelebration] = useState<{ calories: number; protein: number; streakDays: number } | null>(null);

  const remainingCalories = Math.max(0, Math.round(payload.targets.calories - localTotals.calories));

  useEffect(() => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem("fittrack-remaining-kcal", String(remainingCalories));
  }, [remainingCalories]);

  function handleMealLogged(macros: MacroSnapshot, wasFirstToday: boolean) {
    setLocalTotals((prev) => ({
      calories: prev.calories + macros.calories,
      protein: prev.protein + macros.protein,
      carbs: prev.carbs + macros.carbs,
      fat: prev.fat + macros.fat,
    }));

    if (wasFirstToday) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("fittrack-first-log-done", "1");
      }
      setDisplayStreak(payload.streakAfterFirstLogToday);
      setFlameActive(true);
      setCelebration({
        calories: macros.calories,
        protein: macros.protein,
        streakDays: payload.streakAfterFirstLogToday,
      });
    } else {
      router.refresh();
    }
  }

  function closeCelebration() {
    setCelebration(null);
    setFlameActive(false);
    router.refresh();
  }

  return (
    <>
      {celebration ? (
        <FirstLogCelebration
          calories={celebration.calories}
          protein={celebration.protein}
          streakDays={celebration.streakDays}
          onClose={closeCelebration}
        />
      ) : null}

      <div className="space-y-3 pb-2">
        {payload.showWelcome && !dismissWelcome ? (
          <div className="rounded-2xl border border-[rgba(190,255,71,.28)] bg-[rgba(190,255,71,.1)] px-4 py-3">
            <p className="text-sm font-semibold text-[#D6FF9C]">You&apos;re set up</p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">Pick a meal category and tap your template to log in one step.</p>
            <button
              type="button"
              onClick={() => setDismissWelcome(true)}
              className="mt-2 text-[11px] font-semibold text-[#B8E86A]"
            >
              Got it
            </button>
          </div>
        ) : null}

        <HeroSection
          workoutStatus={payload.todayWorkout.status}
          workoutTitle={payload.todayWorkout.title}
          caloriesBurned={payload.caloriesBurnedToday}
          caloriesConsumed={localTotals.calories}
          calorieTarget={payload.targets.calories}
          proteinConsumed={localTotals.protein}
          proteinTarget={payload.targets.protein}
          streak={displayStreak}
          flameActive={flameActive}
        />

        <MealQuickLog
          templates={payload.mealTemplates}
          initialSlot={payload.initialMealSlot}
          mealsLoggedToday={payload.mealsLoggedToday}
          onLogged={handleMealLogged}
        />

        <ProgressOverview
          weightLogs={payload.weightLogs}
          caloriesConsumed={localTotals.calories}
          calorieTarget={payload.targets.calories}
          weeklyWorkoutsCompleted={payload.weeklyWorkoutsCompleted}
          weeklyWorkoutTarget={payload.weeklyWorkoutTarget}
          waterMl={payload.initialWaterMl}
          waterGoalMl={payload.waterGoalMl}
          dateKey={payload.dateKey}
        />

        <TodayPlan plan={payload.todayWorkout} />

        <ActivityTimeline items={payload.timeline} />

        <HealthInsights insights={payload.insights} />

        <AchievementSection
          globalStreak={payload.gamification.globalStreak}
          badges={payload.gamification.badges}
          personalRecords={payload.personalRecords}
          weeklyGoalProgress={payload.gamification.weeklyGoalProgress}
          weeklyGoalTarget={payload.gamification.weeklyGoalTarget}
          level={payload.gamification.level}
          rank={payload.gamification.rank}
        />

        <PushReminderOptIn />
      </div>

      <FloatingQuickActions />
    </>
  );
}
