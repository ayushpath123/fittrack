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

export const CARDIO_TYPES = [
  { value: "walking", label: "Walking" },
  { value: "running", label: "Running" },
  { value: "cycling", label: "Cycling" },
  { value: "treadmill", label: "Treadmill" },
  { value: "stair_climber", label: "Stair Climber" },
  { value: "elliptical", label: "Elliptical" },
  { value: "rowing", label: "Rowing" },
] as const;

export const INTENSITY_LEVELS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
] as const;

export const TEMPLATE_COLOR_THEMES = [
  { value: "chest", color: "#FF6B6B", bg: "rgba(255,107,107,.12)" },
  { value: "back", color: "#4ECDC4", bg: "rgba(78,205,196,.12)" },
  { value: "shoulders", color: "#FFE66D", bg: "rgba(255,230,109,.12)" },
  { value: "arms", color: "#A78BFA", bg: "rgba(167,139,250,.12)" },
  { value: "legs", color: "#F97316", bg: "rgba(249,115,22,.12)" },
  { value: "cardio", color: "#38BDF8", bg: "rgba(56,189,248,.12)" },
  { value: "default", color: "#BEFF47", bg: "rgba(190,255,71,.12)" },
] as const;

export type WorkoutTypeKind = (typeof WORKOUT_TYPES)[number]["value"];
export type CardioTypeKind = (typeof CARDIO_TYPES)[number]["value"];
export type IntensityLevel = (typeof INTENSITY_LEVELS)[number]["value"];
export type TemplateCategory = "strength" | "cardio";

export interface TemplateExercise {
  exerciseName: string;
  sets: number;
  reps: string;
  weight: number | null;
  rest: number;
}

export interface WorkoutLogType {
  id: string;
  userId: string;
  workoutName: string;
  workoutType: WorkoutTypeKind;
  duration: number;
  caloriesBurned: number;
  workoutDate: string;
  notes?: string | null;
  templateId?: string | null;
  exercises?: TemplateExercise[];
  createdAt: string;
  updatedAt?: string;
}

export interface WorkoutTemplateType {
  id: string;
  name: string;
  workoutType: WorkoutTypeKind;
  description?: string | null;
  icon?: string | null;
  colorTheme?: string | null;
  intensityLevel?: IntensityLevel | null;
  category: TemplateCategory;
  duration: number;
  caloriesBurned: number;
  exercises: TemplateExercise[];
  cardioType?: CardioTypeKind | null;
  cardioDistance?: number | null;
  cardioPace?: string | null;
  heartRate?: number | null;
  builtinKey?: string | null;
  useCount?: number;
  lastUsedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkoutTemplateInput {
  name: string;
  workoutType: WorkoutTypeKind;
  description?: string;
  icon?: string;
  colorTheme?: string;
  intensityLevel?: IntensityLevel;
  category?: TemplateCategory;
  duration: number;
  caloriesBurned: number;
  exercises?: TemplateExercise[];
  cardioType?: CardioTypeKind;
  cardioDistance?: number;
  cardioPace?: string;
  heartRate?: number;
}

export interface WorkoutDaySummary {
  workoutCount: number;
  totalCaloriesBurned: number;
  totalDurationMin: number;
}

export interface WorkoutSuggestedTemplate {
  template: WorkoutTemplateType;
  reason: string;
}

export interface WorkoutAnalyticsSnapshot {
  weekly: WorkoutDaySummary & { activeDays: number };
  monthly: WorkoutDaySummary & {
    mostTrainedMuscleGroup: string | null;
    avgDurationMin: number;
  };
  streak: {
    current: number;
    longest: number;
    weeklyCompletionRate: number;
  };
  totalWorkoutsLogged: number;
  totalCaloriesAllTime: number;
  achievements: WorkoutAchievement[];
}

export interface WorkoutAchievement {
  id: string;
  label: string;
  emoji: string;
  unlocked: boolean;
}

export function workoutTypeLabel(type: WorkoutTypeKind): string {
  return WORKOUT_TYPES.find((t) => t.value === type)?.label ?? type;
}

export function cardioTypeLabel(type: CardioTypeKind): string {
  return CARDIO_TYPES.find((t) => t.value === type)?.label ?? type;
}

export function templateTheme(workoutType: WorkoutTypeKind) {
  return (
    TEMPLATE_COLOR_THEMES.find((t) => t.value === workoutType) ??
    TEMPLATE_COLOR_THEMES.find((t) => t.value === "default")!
  );
}
