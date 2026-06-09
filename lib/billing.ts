import type { Plan } from "@prisma/client";
import { NextResponse } from "next/server";
import { getAdminEmails } from "@/lib/admin";

export type BillingState = {
  plan: Plan;
  subscriptionStatus: string | null;
  subscriptionCurrentPeriodEnd: Date | null;
  stripeCustomerId: string | null;
};

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "authenticated", "pending", "trialing"]);

/** Pro access: paid plan, active subscription, or admin allowlist. */
export function hasProAccess(
  u: Pick<BillingState, "plan"> & { subscriptionStatus?: string | null; email?: string | null },
): boolean {
  if (u.plan === "pro") return true;
  if (u.subscriptionStatus && ACTIVE_SUBSCRIPTION_STATUSES.has(u.subscriptionStatus)) return true;
  const email = u.email?.trim().toLowerCase();
  if (email && getAdminEmails().has(email)) return true;
  return false;
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
