import type { UserContext } from "@/types/user";

export function getProgressNarrative(ctx: UserContext): string {
  const { streak_days, protein_hit_rate, avg_daily_calories_7d, calorie_target } = ctx;

  if (streak_days >= 14) return "14 days straight. That's a habit now.";
  if (streak_days >= 7) return "A full week. Most people quit by day 3.";
  if (streak_days >= 5) return `Day ${streak_days}. You're in the top 20% of users this week.`;
  if (streak_days >= 3) return `Day ${streak_days} in a row. The streak is working.`;
  if (streak_days === 2) return "Back-to-back days. This is how habits start.";
  if (streak_days === 1) return "Logged today. Small action, real compound effect.";

  const proteinDays = Number.parseInt(protein_hit_rate.split("/")[0] ?? "0", 10);
  if (proteinDays >= 5) return "Protein on target 5 days this week — your body's noticing.";
  if (proteinDays >= 3) return `Protein hit ${proteinDays} days. Getting consistent.`;

  const calorieDiff = avg_daily_calories_7d - calorie_target;
  if (calorieDiff < -100) return "Running under target all week — make sure you're eating enough.";
  if (calorieDiff > 200) return "Slightly over target this week. One small swap could fix it.";

  return "Logged. Keep the streak alive tomorrow.";
}
