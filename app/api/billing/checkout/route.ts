import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { getRazorpay, getSubscriptionCheckoutConfig } from "@/lib/razorpay";

export async function POST() {
  try {
    const userId = await requireUserId();
    const razorpay = getRazorpay();
    const planId = process.env.RAZORPAY_PLAN_ID;
    if (!razorpay || !planId) {
      return NextResponse.json({ error: "Billing is not configured (Razorpay)." }, { status: 503 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      customer_notify: 1,
      quantity: 1,
      total_count: 120,
      notes: {
        userId: user.id,
      },
    });

    const prefillName = user.email.split("@")[0] || "Healthify User";
    const checkout = getSubscriptionCheckoutConfig({
      subscriptionId: subscription.id,
      prefill: {
        name: prefillName,
        email: user.email,
        contact: "",
      },
    });

    if (!checkout) {
      return NextResponse.json({ error: "Razorpay checkout key is missing." }, { status: 503 });
    }

    return NextResponse.json({
      provider: "razorpay",
      checkout,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("checkout error", e);
    return NextResponse.json({ error: "Checkout failed." }, { status: 500 });
  }
}
