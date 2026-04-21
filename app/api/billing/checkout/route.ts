import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { getRazorpay, getSubscriptionCheckoutConfig } from "@/lib/razorpay";

function normalizeIndianMobile(phone: string | null): string | undefined {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  return undefined;
}

export async function POST() {
  try {
    const userId = await requireUserId();
    const razorpay = getRazorpay();
    const planId = process.env.RAZORPAY_PLAN_ID;
    if (!razorpay || !planId) {
      const missing = [
        !process.env.RAZORPAY_KEY_ID ? "RAZORPAY_KEY_ID" : null,
        !process.env.RAZORPAY_KEY_SECRET ? "RAZORPAY_KEY_SECRET" : null,
        !process.env.RAZORPAY_PLAN_ID ? "RAZORPAY_PLAN_ID" : null,
      ].filter(Boolean);
      return NextResponse.json(
        {
          error: "Billing is not configured (Razorpay).",
          missing,
        },
        { status: 503 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, phone: true, phoneVerified: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const normalizedPhone = normalizeIndianMobile(user.phone);
    if (!normalizedPhone) {
      return NextResponse.json(
        {
          error: "Please add a valid phone number before upgrading.",
          code: "PHONE_REQUIRED",
          settingsUrl: "/verify-phone?callbackUrl=/pricing",
        },
        { status: 400 },
      );
    }
    if (!user.phoneVerified) {
      return NextResponse.json(
        {
          error: "Please verify your phone number before upgrading.",
          code: "PHONE_UNVERIFIED",
          settingsUrl: "/verify-phone?callbackUrl=/pricing",
        },
        { status: 400 },
      );
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
        contact: normalizedPhone,
      },
    });

    if (!checkout) {
      return NextResponse.json(
        {
          error: "Razorpay checkout key is missing.",
          missing: !process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ? ["NEXT_PUBLIC_RAZORPAY_KEY_ID"] : [],
        },
        { status: 503 },
      );
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
