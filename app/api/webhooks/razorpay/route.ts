import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidRazorpayWebhookSignature } from "@/lib/razorpay";

export const runtime = "nodejs";

type RazorpayWebhookPayload = {
  event?: string;
  payload?: {
    subscription?: {
      entity?: {
        id?: string;
        status?: string;
        current_end?: number;
        notes?: { userId?: string };
      };
    };
  };
};

function isActiveSubscription(status: string | undefined): boolean {
  return status === "active" || status === "authenticated" || status === "pending";
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature");
  if (!signature || !isValidRazorpayWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const payload = JSON.parse(rawBody) as RazorpayWebhookPayload;
  const subscription = payload.payload?.subscription?.entity;
  if (!subscription?.id) {
    return NextResponse.json({ received: true });
  }

  try {
    const user =
      (subscription.notes?.userId
        ? await prisma.user.findUnique({ where: { id: subscription.notes.userId } })
        : null) ??
      (await prisma.user.findFirst({
        where: { razorpaySubscriptionId: subscription.id },
      }));

    if (!user) {
      return NextResponse.json({ received: true });
    }

    const active = isActiveSubscription(subscription.status);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        plan: active ? "pro" : "free",
        subscriptionStatus: subscription.status ?? null,
        subscriptionCurrentPeriodEnd: subscription.current_end ? new Date(subscription.current_end * 1000) : null,
        razorpaySubscriptionId: subscription.id,
      },
    });
  } catch (e) {
    console.error("razorpay webhook error", e);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
