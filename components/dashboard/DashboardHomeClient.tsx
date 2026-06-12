"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ActivityTimeline } from "@/components/dashboard/ActivityTimeline";
import { DashboardCompeteStrip } from "@/components/dashboard/DashboardCompeteStrip";
import { FloatingQuickActions } from "@/components/dashboard/FloatingQuickActions";
import { HealthInsights } from "@/components/dashboard/HealthInsights";
import { HeroSection } from "@/components/dashboard/HeroSection";
import { MacrosSummary } from "@/components/dashboard/MacrosSummary";
import { ShareStreakButton } from "@/components/dashboard/ShareStreakButton";
import { WeeklyGoalsStrip } from "@/components/dashboard/WeeklyGoalsStrip";
import { MealCaloriesChart } from "@/components/meals/MealCaloriesChart";
import { WeightProgressCard } from "@/components/dashboard/WeightProgressCard";
import { DashboardWorkoutSection } from "@/components/workout-templates/DashboardWorkoutSection";
import { PushReminderOptIn } from "@/components/PushReminderOptIn";
import { WelcomeTips } from "@/components/WelcomeTips";
import { useCurrentHour } from "@/hooks/useCurrentHour";
import { LOGS_UPDATED_EVENT } from "@/lib/fittrack-events";
import { WORKOUT_SYNC_EVENT, useWorkoutStore } from "@/store/workoutStore";
import type { DashboardPayload } from "@/types/dashboard";

const RECENT_ACTIVITY_LIMIT = 3;
const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100, 365];
const STREAK_AT_RISK_FROM_HOUR = 18;

export function DashboardHomeClient({ payload }: { payload: DashboardPayload }) {
  const router = useRouter();
  const { initFromServer, todaySummary, fetchToday, initialized } = useWorkoutStore();

  useEffect(() => {
    initFromServer(payload.todayWorkoutLogs, payload.workoutSummaryToday, payload.workoutSummaryWeek);
  }, [payload.todayWorkoutLogs, payload.workoutSummaryToday, payload.workoutSummaryWeek, initFromServer]);

  useEffect(() => {
    function refreshDashboard() {
      router.refresh();
      void fetchToday(payload.dateKey);
    }

    window.addEventListener(LOGS_UPDATED_EVENT, refreshDashboard);
    return () => window.removeEventListener(LOGS_UPDATED_EVENT, refreshDashboard);
  }, [router, fetchToday, payload.dateKey]);

  useEffect(() => {
    function onWorkoutSync() {
      void fetchToday(payload.dateKey);
    }
    window.addEventListener(WORKOUT_SYNC_EVENT, onWorkoutSync);
    return () => window.removeEventListener(WORKOUT_SYNC_EVENT, onWorkoutSync);
  }, [fetchToday, payload.dateKey]);

  // One-time celebration per milestone (per device) once today's log secured the streak.
  useEffect(() => {
    if (!payload.mealsLoggedToday || !STREAK_MILESTONES.includes(payload.streak)) return;
    const key = `fittrack-milestone-${payload.streak}`;
    try {
      if (window.localStorage.getItem(key) === "1") return;
      window.localStorage.setItem(key, "1");
    } catch {
      return;
    }
    toast.success(`${payload.streak}-day streak! Keep it rolling.`, {
      id: `streak-milestone-${payload.streak}`,
      duration: 6000,
    });
  }, [payload.mealsLoggedToday, payload.streak]);

  const caloriesBurned = initialized ? todaySummary.totalCaloriesBurned : payload.caloriesBurnedToday;
  const recentActivity = payload.timeline.slice(0, RECENT_ACTIVITY_LIMIT);

  const hour = useCurrentHour();
  const streakAtRisk =
    !payload.mealsLoggedToday && payload.streak > 0 && hour !== null && hour >= STREAK_AT_RISK_FROM_HOUR;
  const showWelcomeTips = payload.showWelcome === true || payload.timeline.length === 0;
  const hasLoggedBefore = payload.timeline.length > 0 || payload.mealsLoggedToday;

  return (
    <>
      <div className="space-y-2.5 pb-20">
        {showWelcomeTips ? <WelcomeTips /> : null}

        <HeroSection
          caloriesBurned={caloriesBurned}
          caloriesConsumed={payload.totals.calories}
          calorieTarget={payload.targets.calories}
          proteinConsumed={payload.totals.protein}
          proteinTarget={payload.targets.protein}
          streak={payload.streak}
          streakAtRisk={streakAtRisk}
        />

        <DashboardCompeteStrip
          data={{
            globalStreak: payload.gamification.globalStreak,
            xp: payload.gamification.xp,
            rank: payload.gamification.rank,
            level: payload.gamification.level,
            xpEarnedToday: payload.gamification.xpEarnedToday,
            weeklyConsistencyPct: payload.gamification.weeklyConsistencyPct,
            badges: payload.gamification.badges,
            leaderboard: null,
          }}
        />

        <ShareStreakButton
          streak={payload.streak}
          level={payload.gamification.level}
          rank={payload.gamification.rank}
        />

        <MacrosSummary totals={payload.totals} targets={payload.targets} />

        <MealCaloriesChart data={payload.caloriesConsumedLast7Days} />

        <WeightProgressCard logs={payload.weightLogs} />

        <WeeklyGoalsStrip
          weeklyWorkoutsCompleted={payload.weeklyWorkoutsCompleted}
          weeklyWorkoutTarget={payload.weeklyWorkoutTarget}
          waterMl={payload.initialWaterMl}
          waterGoalMl={payload.waterGoalMl}
        />

        {hasLoggedBefore ? <PushReminderOptIn /> : null}

        <DashboardWorkoutSection templates={payload.workoutTemplates} />

        <HealthInsights insights={payload.insights} limit={1} />

        <ActivityTimeline items={recentActivity} />
      </div>

      <FloatingQuickActions />
    </>
  );
}
