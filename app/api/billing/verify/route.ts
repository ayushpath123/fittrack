import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { getRazorpay, isValidRazorpaySubscriptionSignature } from "@/lib/razorpay";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = (await req.json()) as {
      razorpay_payment_id?: string;
      razorpay_subscription_id?: string;
      razorpay_signature?: string;
    };

    if (!body.razorpay_payment_id || !body.razorpay_subscription_id || !body.razorpay_signature) {
      return NextResponse.json({ error: "Missing Razorpay response fields." }, { status: 400 });
    }

    const valid = isValidRazorpaySubscriptionSignature({
      paymentId: body.razorpay_payment_id,
      subscriptionId: body.razorpay_subscription_id,
      signature: body.razorpay_signature,
    });
    if (!valid) {
      return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
    }

    const razorpay = getRazorpay();
    if (!razorpay) {
      return NextResponse.json({ error: "Razorpay not configured." }, { status: 503 });
    }

    const subscription = await razorpay.subscriptions.fetch(body.razorpay_subscription_id);
    const active = ["active", "authenticated", "pending"].includes(subscription.status);

    await prisma.user.update({
      where: { id: userId },
      data: {
        plan: active ? "pro" : "free",
        subscriptionStatus: subscription.status,
        subscriptionCurrentPeriodEnd: subscription.current_end ? new Date(subscription.current_end * 1000) : null,
        razorpaySubscriptionId: subscription.id,
      },
    });

    return NextResponse.json({ verified: true, hasPro: active });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("billing verify error", e);
    return NextResponse.json({ error: "Verification failed." }, { status: 500 });
  }
}
