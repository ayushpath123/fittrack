import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const stripe = getStripe();
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !whSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const raw = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, whSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId ?? session.client_reference_id;
        const subId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription && typeof session.subscription === "object" && "id" in session.subscription
              ? session.subscription.id
              : null;
        const custRaw = session.customer;
        const customerId =
          typeof custRaw === "string" ? custRaw : custRaw && typeof custRaw === "object" && "id" in custRaw ? custRaw.id : null;
        if (!userId || !subId || !customerId) {
          break;
        }
        const sub = await stripe.subscriptions.retrieve(subId);
        await prisma.user.update({
          where: { id: userId },
          data: {
            plan: "pro",
            stripeCustomerId: customerId,
            stripeSubscriptionId: sub.id,
            subscriptionStatus: sub.status,
            subscriptionCurrentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
          },
        });
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const user = await prisma.user.findFirst({
          where: { stripeSubscriptionId: sub.id },
        });
        if (!user) {
          break;
        }
        const active = sub.status === "active" || sub.status === "trialing";
        await prisma.user.update({
          where: { id: user.id },
          data: {
            plan: active ? "pro" : "free",
            subscriptionStatus: sub.status,
            subscriptionCurrentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
          },
        });
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("stripe webhook handler error", e);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
