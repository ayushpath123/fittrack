export type Goal = "lose" | "maintain" | "gain";

export interface MacroResults {
  calorieTarget: number;
  proteinTarget: number;
  carbTarget: number;
  fatTarget: number;
  waterTargetMl: number;
}
