import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { getStripe, appOrigin } from "@/lib/stripe";

export async function POST() {
  try {
    const userId = await requireUserId();
    const stripe = getStripe();
    const priceId = process.env.STRIPE_PRICE_ID_PRO;
    if (!stripe || !priceId) {
      return NextResponse.json({ error: "Billing is not configured (Stripe)." }, { status: 503 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const origin = appOrigin();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/settings?billing=success#subscription`,
      cancel_url: `${origin}/pricing`,
      client_reference_id: userId,
      customer: user.stripeCustomerId ?? undefined,
      customer_email: user.stripeCustomerId ? undefined : user.email,
      metadata: { userId },
      subscription_data: {
        metadata: { userId },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("checkout error", e);
    return NextResponse.json({ error: "Checkout failed." }, { status: 500 });
  }
}
