export const WORKOUT_TYPES = [
  { value: "chest", label: "Chest" },
  { value: "back", label: "Back" },
  { value: "legs", label: "Legs" },
  { value: "shoulders", label: "Shoulders" },
  { value: "arms", label: "Arms" },
  { value: "core", label: "Core" },
  { value: "cardio", label: "Cardio" },
  { value: "full_body", label: "Full Body" },
  { value: "sports", label: "Sports" },
  { value: "other", label: "Other" },
] as const;

export type WorkoutTypeKind = (typeof WORKOUT_TYPES)[number]["value"];

export interface WorkoutLogType {
  id: string;
  userId: string;
  workoutName: string;
  workoutType: WorkoutTypeKind;
  duration: number;
  caloriesBurned: number;
  workoutDate: string;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface WorkoutTemplateType {
  id: string;
  name: string;
  workoutType: WorkoutTypeKind;
  duration: number;
  caloriesBurned: number;
  useCount?: number;
  lastUsedAt?: string | null;
}

export interface WorkoutDaySummary {
  workoutCount: number;
  totalCaloriesBurned: number;
  totalDurationMin: number;
}

export function workoutTypeLabel(type: WorkoutTypeKind): string {
  return WORKOUT_TYPES.find((t) => t.value === type)?.label ?? type;
}
