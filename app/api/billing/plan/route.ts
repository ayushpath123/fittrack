import { NextResponse } from "next/server";
import { getProPlanPricing } from "@/lib/razorpay";
import { formatPlanPrice } from "@/lib/billing-display";

export const runtime = "nodejs";

/** Public pricing info for the Pro plan (no auth — shown to guests on /pricing). */
export async function GET() {
  const pricing = await getProPlanPricing();
  if (!pricing) {
    return NextResponse.json({ configured: false as const });
  }
  return NextResponse.json({
    configured: true as const,
    amount: pricing.amount,
    currency: pricing.currency,
    period: pricing.period,
    interval: pricing.interval,
    display: formatPlanPrice(pricing),
  });
}
