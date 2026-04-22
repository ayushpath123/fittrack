import type { MealOutput } from "@/types/nutrition";
import type { UserContext } from "@/types/user";

export function buildDeterministicInsight(meal: MealOutput, userCtx: UserContext): {
  meal_insight: string;
  day_context: string;
  week_signal: string | null;
} {
  const { calories, protein, carbs, fat } = meal.total;
  const calorieDelta = userCtx.remaining_calories - calories;
  const proteinGapAfterMeal = Math.max(0, userCtx.remaining_protein - protein);

  let mealInsight = `Meal logged: ${Math.round(calories)} kcal, ${Math.round(protein)}g protein.`;
  if (fat > 28) mealInsight = `Fat is high (${Math.round(fat)}g). A drier prep could cut calories.`;
  else if (protein < 15) mealInsight = `Protein is low (${Math.round(protein)}g). Add a simple protein side next meal.`;
  else if (carbs > 75) mealInsight = `Carbs are high (${Math.round(carbs)}g). Keep next meal lighter on carbs.`;

  const dayContext =
    calorieDelta >= 0
      ? `${Math.max(0, Math.round(calorieDelta))} kcal left today; ${Math.round(proteinGapAfterMeal)}g protein still pending.`
      : `${Math.abs(Math.round(calorieDelta))} kcal over target; keep next meal smaller and protein-focused.`;

  let weekSignal: string | null = null;
  const proteinDays = Number.parseInt(userCtx.protein_hit_rate.split("/")[0] ?? "0", 10);
  if (proteinDays <= 2) weekSignal = `Protein target hit only ${proteinDays}/7 days this week.`;
  if (userCtx.avg_daily_calories_7d > userCtx.calorie_target + 180) {
    weekSignal = `7-day calories are running above target by ~${Math.round(userCtx.avg_daily_calories_7d - userCtx.calorie_target)}.`;
  }

  return { meal_insight: mealInsight, day_context: dayContext, week_signal: weekSignal };
}

export function buildDeterministicNudge(meal: MealOutput, userCtx: UserContext): { nudge: string } {
  if (meal.total.carbs > 70) return { nudge: "Walk 10 minutes in the next hour." };
  if (meal.total.protein < 15) return { nudge: "Add curd, eggs, or paneer in your next meal." };
  if (userCtx.remaining_calories < 350) return { nudge: "Set dinner reminder for a light, early meal." };
  return { nudge: "Drink one glass of water before your next meal." };
}
