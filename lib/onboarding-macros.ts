import type { Goal, MacroResults } from "@/components/onboarding/types";

export function calculateMacros(weight: number, height: number, goal: Goal): MacroResults {
  const bmr = 10 * weight + 6.25 * height - 5 * 25 + 5;
  let calories = Math.round(bmr * 1.55);

  if (goal === "lose") calories -= 400;
  else if (goal === "gain") calories += 300;

  const proteinTarget = Math.round(weight * 1.9);
  const fatTarget = Math.round((calories * 0.225) / 9);
  let carbTarget = Math.round((calories - proteinTarget * 4 - fatTarget * 9) / 4);
  carbTarget = Math.max(50, carbTarget);
  let waterTargetMl = Math.round(weight * 35);
  waterTargetMl = Math.min(20000, Math.max(500, waterTargetMl));

  return {
    calorieTarget: Math.max(800, calories),
    proteinTarget: Math.max(30, proteinTarget),
    carbTarget,
    fatTarget: Math.max(20, fatTarget),
    waterTargetMl,
  };
}
