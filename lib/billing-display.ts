export type PlanPeriod = "daily" | "weekly" | "monthly" | "yearly";

export type PlanPricing = {
  /** Amount in currency subunits (paise for INR), as returned by Razorpay. */
  amount: number;
  currency: string;
  period: PlanPeriod;
  interval: number;
};

const PERIOD_UNIT: Record<PlanPeriod, string> = {
  daily: "day",
  weekly: "week",
  monthly: "month",
  yearly: "year",
};

/** "₹199/month", "₹1,999/year", "₹49.50 every 3 months" — or null when amount is unusable. */
export function formatPlanPrice(pricing: PlanPricing): string | null {
  if (!Number.isFinite(pricing.amount) || pricing.amount <= 0) return null;
  const major = pricing.amount / 100;
  const wholeUnits = Number.isInteger(major);
  let formatted: string;
  try {
    formatted = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: pricing.currency,
      minimumFractionDigits: wholeUnits ? 0 : 2,
      maximumFractionDigits: wholeUnits ? 0 : 2,
    }).format(major);
  } catch {
    return null;
  }
  const unit = PERIOD_UNIT[pricing.period];
  if (!unit) return formatted;
  return pricing.interval > 1 ? `${formatted} every ${pricing.interval} ${unit}s` : `${formatted}/${unit}`;
}
