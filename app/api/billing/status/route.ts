import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserIdFromRequest } from "@/lib/auth";
import { hasProAccess } from "@/lib/billing";
import { getRazorpay } from "@/lib/razorpay";

const ENDED_STATUSES = new Set(["cancelled", "completed", "expired"]);

const USER_SELECT = {
  plan: true,
  email: true,
  subscriptionStatus: true,
  subscriptionCurrentPeriodEnd: true,
  stripeCustomerId: true,
  razorpaySubscriptionId: true,
  phone: true,
  phoneVerified: true,
} as const;

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserIdFromRequest(req);
    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: USER_SELECT,
    });
    if (!user) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Safety net: if a scheduled cancellation has passed its period end but the
    // subscription.cancelled webhook never arrived, reconcile against Razorpay.
    if (
      user.subscriptionStatus === "cancel_scheduled" &&
      user.subscriptionCurrentPeriodEnd &&
      user.subscriptionCurrentPeriodEnd.getTime() < Date.now() &&
      user.razorpaySubscriptionId
    ) {
      const razorpay = getRazorpay();
      if (razorpay) {
        try {
          const sub = await razorpay.subscriptions.fetch(user.razorpaySubscriptionId);
          if (ENDED_STATUSES.has(sub.status)) {
            user = await prisma.user.update({
              where: { id: userId },
              data: {
                plan: "free",
                subscriptionStatus: sub.status,
                subscriptionCurrentPeriodEnd: sub.ended_at
                  ? new Date(sub.ended_at * 1000)
                  : user.subscriptionCurrentPeriodEnd,
              },
              select: USER_SELECT,
            });
          }
        } catch (e) {
          console.error("billing status reconcile failed", e);
        }
      }
    }

    const cancelScheduled = user.subscriptionStatus === "cancel_scheduled";
    const subscriptionEnded = ENDED_STATUSES.has(user.subscriptionStatus ?? "");
    return NextResponse.json({
      plan: user.plan,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionCurrentPeriodEnd: user.subscriptionCurrentPeriodEnd?.toISOString() ?? null,
      hasPro: hasProAccess(user),
      canManageBilling: !!user.stripeCustomerId,
      canCancelSubscription:
        !!user.razorpaySubscriptionId && hasProAccess(user) && !cancelScheduled && !subscriptionEnded,
      cancelScheduled,
      phone: user.phone,
      phoneVerified: !!user.phoneVerified,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
