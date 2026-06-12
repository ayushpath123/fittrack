import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserIdFromRequest } from "@/lib/auth";
import { getRazorpay } from "@/lib/razorpay";
import { trackEvent } from "@/lib/analytics";

export const runtime = "nodejs";

const ENDED_STATUSES = new Set(["cancelled", "completed", "expired"]);

/** Razorpay SDK rejects with `{ statusCode, error: { description } }`, not an Error. */
function razorpayErrorMessage(e: unknown): string | null {
  if (typeof e === "object" && e !== null && "error" in e) {
    const inner = (e as { error?: { description?: string } }).error;
    if (inner?.description) return inner.description;
  }
  return null;
}

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserIdFromRequest(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const razorpay = getRazorpay();
  if (!razorpay) {
    return NextResponse.json({ error: "Billing is not configured (Razorpay)." }, { status: 503 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { razorpaySubscriptionId: true, subscriptionCurrentPeriodEnd: true },
  });
  if (!user?.razorpaySubscriptionId) {
    return NextResponse.json({ error: "No Razorpay subscription on file." }, { status: 400 });
  }

  try {
    const current = await razorpay.subscriptions.fetch(user.razorpaySubscriptionId);

    if (ENDED_STATUSES.has(current.status)) {
      await prisma.user.update({
        where: { id: userId },
        data: { plan: "free", subscriptionStatus: current.status },
      });
      trackEvent("subscription_cancelled", { userId, meta: { atPeriodEnd: false } });
      return NextResponse.json({ cancelled: true, cancelAtPeriodEnd: false, accessUntil: null });
    }

    // Paid cycles end at the period boundary; anything not yet charged ends immediately.
    const cancelAtCycleEnd = current.status === "active";
    const result = await razorpay.subscriptions.cancel(user.razorpaySubscriptionId, cancelAtCycleEnd);
    const endedNow = ENDED_STATUSES.has(result.status);

    const periodEnd = result.current_end
      ? new Date(result.current_end * 1000)
      : user.subscriptionCurrentPeriodEnd;

    await prisma.user.update({
      where: { id: userId },
      data: endedNow
        ? { plan: "free", subscriptionStatus: result.status, subscriptionCurrentPeriodEnd: periodEnd }
        : { subscriptionStatus: "cancel_scheduled", subscriptionCurrentPeriodEnd: periodEnd },
    });

    trackEvent("subscription_cancelled", { userId, meta: { atPeriodEnd: !endedNow } });
    return NextResponse.json({
      cancelled: true,
      cancelAtPeriodEnd: !endedNow,
      accessUntil: !endedNow && periodEnd ? periodEnd.toISOString() : null,
    });
  } catch (e) {
    console.error("billing cancel error", e);
    const detail = razorpayErrorMessage(e);
    return NextResponse.json(
      { error: detail ?? "Could not cancel the subscription. Try again or contact support." },
      { status: 502 },
    );
  }
}
