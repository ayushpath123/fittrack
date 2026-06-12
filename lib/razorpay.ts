import Razorpay from "razorpay";
import { createHmac } from "crypto";
import { appOrigin } from "@/lib/stripe";
import type { PlanPricing } from "@/lib/billing-display";

type RazorpayCheckoutPrefill = {
  name: string;
  email: string;
  contact?: string;
};

const PLAN_PRICING_TTL_MS = 10 * 60 * 1000;
let planPricingCache: { planId: string; value: PlanPricing; fetchedAt: number } | null = null;

/** Fetches the Pro plan's price from Razorpay, cached in-memory for 10 minutes. */
export async function getProPlanPricing(): Promise<PlanPricing | null> {
  const planId = process.env.RAZORPAY_PLAN_ID;
  const razorpay = getRazorpay();
  if (!razorpay || !planId) return null;
  if (
    planPricingCache &&
    planPricingCache.planId === planId &&
    Date.now() - planPricingCache.fetchedAt < PLAN_PRICING_TTL_MS
  ) {
    return planPricingCache.value;
  }
  try {
    const plan = await razorpay.plans.fetch(planId);
    const amount = typeof plan.item.amount === "string" ? Number(plan.item.amount) : plan.item.amount;
    if (!Number.isFinite(amount) || amount <= 0) return null;
    const value: PlanPricing = {
      amount,
      currency: plan.item.currency || "INR",
      period: plan.period,
      interval: plan.interval ?? 1,
    };
    planPricingCache = { planId, value, fetchedAt: Date.now() };
    return value;
  } catch (e) {
    console.error("razorpay plan fetch failed", e);
    return null;
  }
}

export function getRazorpay(): Razorpay | null {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export function getRazorpayCheckoutKey(): string | null {
  return process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? process.env.RAZORPAY_KEY_ID ?? null;
}

export function getSubscriptionCheckoutConfig(args: {
  subscriptionId: string;
  prefill: RazorpayCheckoutPrefill;
}) {
  const key = getRazorpayCheckoutKey();
  if (!key) return null;

  return {
    key,
    subscription_id: args.subscriptionId,
    name: "FitTrack",
    description: "FitTrack Pro subscription",
    image: `${appOrigin()}/icon.png`,
    prefill: args.prefill,
    readonly: {
      email: true,
      contact: !!args.prefill.contact,
    },
    notes: {
      product: "healthify-pro",
    },
    theme: {
      color: "#BEFF47",
    },
  };
}

export function isValidRazorpaySubscriptionSignature(args: {
  paymentId: string;
  subscriptionId: string;
  signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const generated = createHmac("sha256", secret)
    .update(`${args.paymentId}|${args.subscriptionId}`)
    .digest("hex");
  return generated === args.signature;
}

export function isValidRazorpayWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const generated = createHmac("sha256", secret).update(rawBody).digest("hex");
  return generated === signature;
}
