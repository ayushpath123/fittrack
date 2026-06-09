"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ActivityTimeline } from "@/components/dashboard/ActivityTimeline";
import { FloatingQuickActions } from "@/components/dashboard/FloatingQuickActions";
import { HealthInsights } from "@/components/dashboard/HealthInsights";
import { HeroSection } from "@/components/dashboard/HeroSection";
import { MacrosSummary } from "@/components/dashboard/MacrosSummary";
import { WeeklyGoalsStrip } from "@/components/dashboard/WeeklyGoalsStrip";
import { MealCaloriesChart } from "@/components/meals/MealCaloriesChart";
import { WeightProgressCard } from "@/components/dashboard/WeightProgressCard";
import { DashboardWorkoutSection } from "@/components/workout-templates/DashboardWorkoutSection";
import { LOGS_UPDATED_EVENT } from "@/lib/fittrack-events";
import { WORKOUT_SYNC_EVENT, useWorkoutStore } from "@/store/workoutStore";
import type { DashboardPayload } from "@/types/dashboard";

const RECENT_ACTIVITY_LIMIT = 3;

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

  const caloriesBurned = initialized ? todaySummary.totalCaloriesBurned : payload.caloriesBurnedToday;
  const recentActivity = payload.timeline.slice(0, RECENT_ACTIVITY_LIMIT);

  return (
    <>
      <div className="space-y-2.5 pb-20">
        <HeroSection
          caloriesBurned={caloriesBurned}
          caloriesConsumed={payload.totals.calories}
          calorieTarget={payload.targets.calories}
          proteinConsumed={payload.totals.protein}
          proteinTarget={payload.targets.protein}
          streak={payload.streak}
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

        <DashboardWorkoutSection templates={payload.workoutTemplates} />

        <HealthInsights insights={payload.insights} limit={1} />

        <ActivityTimeline items={recentActivity} />
      </div>

      <FloatingQuickActions />
    </>
  );
}
