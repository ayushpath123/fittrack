export type MealNutrition = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
};

export type MealItemEstimate = {
  name: string;
  quantity_estimate: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
  reasoning_tag: string;
};

export type MealOutput = {
  items: MealItemEstimate[];
  total: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  overall_confidence: number;
  uncertainty_note: string;
};

export type ValidationResult = {
  output: MealOutput;
  warnings: string[];
  adjusted: boolean;
};
