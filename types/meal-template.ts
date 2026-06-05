export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface MealTemplate {
  id: string;
  userId: string;
  name: string;
  mealType: MealType;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  useCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MealTemplateInput {
  name: string;
  mealType: MealType;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}
