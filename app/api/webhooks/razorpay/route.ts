import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidRazorpayWebhookSignature } from "@/lib/razorpay";
import { sendPaymentRetryingEmail, sendSubscriptionHaltedEmail } from "@/lib/mailer";
import { appOrigin } from "@/lib/stripe";

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
    // A locally scheduled cancellation keeps Razorpay status "active" until cycle
    // end — don't let interim webhooks wipe the cancel_scheduled marker.
    const preserveCancelScheduled =
      user.subscriptionStatus === "cancel_scheduled" && subscription.status === "active";
    await prisma.user.update({
      where: { id: user.id },
      data: {
        plan: active ? "pro" : "free",
        subscriptionStatus: preserveCancelScheduled ? "cancel_scheduled" : (subscription.status ?? null),
        subscriptionCurrentPeriodEnd: subscription.current_end ? new Date(subscription.current_end * 1000) : null,
        razorpaySubscriptionId: subscription.id,
      },
    });

    // Dunning: notify on the first failed charge (pending) and when retries are
    // exhausted (halted). Email failures must never fail the webhook.
    const previousStatus = user.subscriptionStatus;
    try {
      if (subscription.status === "pending" && previousStatus !== "pending") {
        await sendPaymentRetryingEmail(user.email, `${appOrigin()}/settings#subscription`);
      } else if (subscription.status === "halted" && previousStatus !== "halted") {
        await sendSubscriptionHaltedEmail(user.email, `${appOrigin()}/pricing`);
      }
    } catch (mailError) {
      console.error("razorpay webhook dunning email failed", mailError);
    }
  } catch (e) {
    console.error("razorpay webhook error", e);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
