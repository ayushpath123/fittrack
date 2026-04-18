import type { Plan } from "@prisma/client";
import { NextResponse } from "next/server";

export type BillingState = {
  plan: Plan;
  subscriptionStatus: string | null;
  subscriptionCurrentPeriodEnd: Date | null;
  stripeCustomerId: string | null;
};

/** Pro access: `plan` is set to `pro` by Stripe webhooks after successful subscription. */
export function hasProAccess(u: Pick<BillingState, "plan">): boolean {
  return u.plan === "pro";
}

export function proRequiredResponse(upgradeUrl = "/pricing") {
  return NextResponse.json(
    {
      error: "PRO_REQUIRED",
      message: "Upgrade to Pro to use AI features.",
      upgradeUrl,
    },
    { status: 403 },
  );
}
