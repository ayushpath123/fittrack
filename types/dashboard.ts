import type { ActivityFeedItem } from "@/lib/activity-timeline";
import type { LoggableMealTemplate, MacroSnapshot } from "@/lib/meal-templates";
import type { WeightLogType } from "@/types";

export type WorkoutPlanStatus = "not_started" | "in_progress" | "completed";

export type TodayWorkoutPlan = {
  title: string;
  muscleGroups: string[];
  durationMin: number;
  estimatedCalories: number;
  status: WorkoutPlanStatus;
  workoutId?: string;
  exerciseCount: number;
};

export type PersonalRecord = {
  exercise: string;
  weight: number;
  reps: number;
  date: string;
};

export type HealthInsight = {
  id: string;
  message: string;
  tone: "positive" | "neutral" | "warning";
};

export type DashboardPayload = {
  dateLabel: string;
  dateKey: string;
  targets: MacroSnapshot;
  totals: MacroSnapshot;
  streak: number;
  streakAfterFirstLogToday: number;
  mealsLoggedToday: boolean;
  waterGoalMl: number;
  initialWaterMl: number;
  weightLogs: WeightLogType[];
  weightLoggedToday: boolean;
  todayWorkout: TodayWorkoutPlan;
  caloriesBurnedToday: number;
  weeklyWorkoutsCompleted: number;
  weeklyWorkoutTarget: number;
  gamification: {
    globalStreak: number;
    mealStreak: number;
    workoutStreak: number;
    badges: string[];
    level: number;
    rank: string;
    weeklyGoalProgress: number;
    weeklyGoalTarget: number;
    xpEarnedToday: number;
  };
  timeline: ActivityFeedItem[];
  insights: HealthInsight[];
  personalRecords: PersonalRecord[];
  mealTemplates: LoggableMealTemplate[];
  initialMealSlot: string;
  showWelcome?: boolean;
};
