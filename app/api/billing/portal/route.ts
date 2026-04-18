import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { getStripe, appOrigin } from "@/lib/stripe";

export async function POST() {
  try {
    const userId = await requireUserId();
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: "Billing is not configured (Stripe)." }, { status: 503 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });
    if (!user?.stripeCustomerId) {
      return NextResponse.json({ error: "No billing account on file." }, { status: 400 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appOrigin()}/settings#subscription`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("portal error", e);
    return NextResponse.json({ error: "Portal failed." }, { status: 500 });
  }
}
