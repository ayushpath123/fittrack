import { toLocalDateKey } from "@/lib/date";
import type { ExerciseEntryType } from "@/types";
import type { TodayWorkoutPlan, WorkoutPlanStatus } from "@/types/dashboard";

const PLAN_ROTATION = [
  { title: "Push Strength", muscleGroups: ["Chest", "Shoulders", "Triceps"], durationMin: 45, estimatedCalories: 320 },
  { title: "Pull Power", muscleGroups: ["Back", "Biceps", "Rear Delts"], durationMin: 50, estimatedCalories: 340 },
  { title: "Leg Day", muscleGroups: ["Quads", "Hamstrings", "Glutes"], durationMin: 55, estimatedCalories: 380 },
  { title: "Full Body", muscleGroups: ["Compound", "Core"], durationMin: 40, estimatedCalories: 300 },
] as const;

function inferMuscleGroups(exercises: ExerciseEntryType[]): string[] {
  const groups = new Set<string>();
  for (const ex of exercises) {
    const n = ex.name.toLowerCase();
    if (n.includes("bench") || n.includes("push") || n.includes("ohp") || n.includes("chest")) groups.add("Chest");
    else if (n.includes("squat") || n.includes("leg") || n.includes("rdl") || n.includes("lunge")) groups.add("Legs");
    else if (n.includes("deadlift") || n.includes("row") || n.includes("pull") || n.includes("lat")) groups.add("Back");
    else if (n.includes("curl") || n.includes("tricep")) groups.add("Arms");
    else groups.add("Full body");
  }
  return [...groups].slice(0, 3);
}

function estimateCaloriesFromExercises(exercises: ExerciseEntryType[]): number {
  if (!exercises.length) return 0;
  return Math.round(
    exercises.reduce((sum, ex) => sum + ex.sets * ex.reps * 0.35 + ex.sets * ex.weight * 0.04, 0),
  );
}

function estimateDuration(exercises: ExerciseEntryType[]): number {
  if (!exercises.length) return 40;
  const sets = exercises.reduce((s, ex) => s + ex.sets, 0);
  return Math.min(75, Math.max(25, Math.round(sets * 2.5 + exercises.length * 3)));
}

function titleFromExercises(exercises: ExerciseEntryType[]): string {
  const groups = inferMuscleGroups(exercises);
  if (groups.includes("Chest") && groups.includes("Legs")) return "Full Body Session";
  if (groups.length === 1 && groups[0] === "Legs") return "Leg Day";
  if (groups.includes("Chest")) return "Push Session";
  if (groups.includes("Back")) return "Pull Session";
  return "Training Session";
}

function suggestRotatingPlan(recentCompletedDates: string[]): (typeof PLAN_ROTATION)[number] {
  if (!recentCompletedDates.length) return PLAN_ROTATION[0];
  const dayOffset = recentCompletedDates.length % PLAN_ROTATION.length;
  return PLAN_ROTATION[(dayOffset + 1) % PLAN_ROTATION.length];
}

export function buildTodayWorkoutPlan(args: {
  todayWorkout: {
    id: string;
    completed: boolean;
    exercises: ExerciseEntryType[];
    caloriesBurned?: number | null;
  } | null;
  recentCompletedWorkoutDates: string[];
}): TodayWorkoutPlan {
  const { todayWorkout, recentCompletedWorkoutDates } = args;

  if (todayWorkout) {
    const status: WorkoutPlanStatus = todayWorkout.completed
      ? "completed"
      : todayWorkout.exercises.length > 0
        ? "in_progress"
        : "not_started";

    return {
      title: titleFromExercises(todayWorkout.exercises),
      muscleGroups: todayWorkout.exercises.length
        ? inferMuscleGroups(todayWorkout.exercises)
        : suggestRotatingPlan(recentCompletedWorkoutDates).muscleGroups.slice(),
      durationMin: estimateDuration(todayWorkout.exercises),
      estimatedCalories:
        todayWorkout.caloriesBurned != null && todayWorkout.caloriesBurned > 0
          ? todayWorkout.caloriesBurned
          : estimateCaloriesFromExercises(todayWorkout.exercises) ||
            suggestRotatingPlan(recentCompletedWorkoutDates).estimatedCalories,
      status,
      workoutId: todayWorkout.id,
      exerciseCount: todayWorkout.exercises.length,
    };
  }

  const suggestion = suggestRotatingPlan(recentCompletedWorkoutDates);
  return {
    title: suggestion.title,
    muscleGroups: [...suggestion.muscleGroups],
    durationMin: suggestion.durationMin,
    estimatedCalories: suggestion.estimatedCalories,
    status: "not_started",
    exerciseCount: 0,
  };
}

export function estimateCaloriesBurnedToday(
  todayWorkout: { completed: boolean; exercises: ExerciseEntryType[]; caloriesBurned?: number | null } | null,
): number {
  if (!todayWorkout) return 0;
  if (todayWorkout.caloriesBurned != null && todayWorkout.caloriesBurned > 0) {
    return todayWorkout.caloriesBurned;
  }
  if (!todayWorkout.exercises.length) return 0;
  const base = estimateCaloriesFromExercises(todayWorkout.exercises);
  return todayWorkout.completed ? base : Math.round(base * 0.55);
}

export function countWeeklyWorkouts(workoutDates: Date[], weekStart: Date, weekEnd: Date): number {
  const days = new Set<string>();
  for (const d of workoutDates) {
    const t = d.getTime();
    if (t >= weekStart.getTime() && t <= weekEnd.getTime()) {
      days.add(toLocalDateKey(d));
    }
  }
  return days.size;
}
