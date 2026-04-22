import type { PaywallState, UserContext } from "@/types/user";

export function getPaywallState(ctx: UserContext): PaywallState {
  if (ctx.is_premium) {
    return { showPaywall: false, blur: false, trigger: null };
  }

  if (ctx.total_logs === 3) {
    return {
      showPaywall: true,
      blur: "weekly_chart",
      trigger: "third_log",
      message: "Your week at a glance",
      cta: "See full patterns — ₹99/month",
    };
  }

  if (ctx.streak_days === 7) {
    return {
      showPaywall: true,
      blur: "weekly_report",
      trigger: "first_week",
      message: "Your first week report is ready",
      cta: "Read your full report — ₹99/month",
    };
  }

  if (ctx.coach_questions_used >= 1) {
    return {
      showPaywall: true,
      blur: "coach",
      trigger: "coach_limit",
      message: "1 free coaching question used",
      cta: "Unlimited coaching — ₹99/month",
    };
  }

  return { showPaywall: false, blur: false, trigger: null };
}
