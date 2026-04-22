export type UserContext = {
  goal: string;
  calorie_target: number;
  protein_target: number;
  streak_days: number;
  avg_daily_calories_7d: number;
  protein_hit_rate: string;
  most_skipped_meal: "breakfast" | "lunch" | "dinner";
  last_3_meals: string[];
  goal_progress_this_week: string;
  total_logs: number;
  is_premium: boolean;
  coach_questions_used: number;
  meal_time: "morning" | "afternoon" | "evening" | "night";
  remaining_calories: number;
  remaining_protein: number;
  current_weight: number | null;
  activity: string;
};

export type PaywallState = {
  showPaywall: boolean;
  blur: "weekly_chart" | "weekly_report" | "coach" | false;
  trigger: "third_log" | "first_week" | "coach_limit" | null;
  message?: string;
  cta?: string;
};
