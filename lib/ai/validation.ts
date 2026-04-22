import type { MealOutput, ValidationResult } from "@/types/nutrition";

type HistoryMeal = {
  name: string;
  calories: number;
};

export function validateMealOutput(output: MealOutput, history: HistoryMeal[]): ValidationResult {
  const warnings: string[] = [];
  let adjusted = false;

  if (output.total.calories < 50) {
    warnings.push("Calories seem too low — please verify");
    adjusted = true;
  }
  if (output.total.calories > 2000) {
    warnings.push("Single meal over 2000 kcal — unusual, please confirm");
  }
  if (output.total.protein > 80) {
    warnings.push("Protein over 80g in one meal — adjusted to 80g");
    output.total.protein = 80;
    adjusted = true;
  }
  if (output.overall_confidence < 0.6) {
    warnings.push("Low confidence estimate — tap to edit");
  }

  const first = output.items[0]?.name?.toLowerCase() ?? "";
  if (first) {
    const similarMeals = history.filter((m) => m.name.toLowerCase().includes(first));
    if (similarMeals.length > 0) {
      const historicalAvg = similarMeals.reduce((sum, m) => sum + m.calories, 0) / similarMeals.length;
      const delta = Math.abs(output.total.calories - historicalAvg);
      if (delta > 200) {
        warnings.push(`Differs from your usual ${output.items[0]?.name} log by ${Math.round(delta)} kcal`);
      }
    }
  }

  return { output, warnings, adjusted };
}
