export interface FoodItemType {
  id: string;
  name: string;
  baseQuantity: string;
  baseWeightGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  price: number;
  barcode?: string | null;
}

export interface MealItem {
  foodId: string;
  grams?: number;
  multiplier?: number;
}

export interface MealTemplateType {
  id: string;
  userId?: string;
  name: string;
  mealType: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  useCount?: number;
  lastUsedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  /** @deprecated Legacy food-based templates */
  items?: { foodId: string; quantityMultiplier: number }[];
}

export type { MealTemplate, MealTemplateInput, MealType } from "./meal-template";

export interface MealEntryType {
  id: string;
  date: string;
  mealType: string;
  items: MealItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  estimateId?: string | null;
}

export interface MealEstimateType {
  id: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
  status: "draft" | "confirmed" | "used" | "rejected";
  source: string;
  imageName?: string | null;
  imageMimeType?: string | null;
  linkedMealEntryId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExerciseEntryType {
  id?: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
}

export interface WorkoutType {
  id: string;
  date: string;
  completed: boolean;
  caloriesBurned?: number | null;
  exercises: ExerciseEntryType[];
}

export interface WeightLogType {
  id: string;
  userId?: string;
  weight: number;
  unit?: "kg";
  /** ISO datetime when the weight was logged */
  date: string;
  loggedAt?: string;
  createdAt?: string;
  waistCm?: number | null;
}

export interface DailyTotals {
  calories: number;
  protein: number;
  mealCount: number;
}
