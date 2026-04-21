import Razorpay from "razorpay";
import { createHmac } from "crypto";
import { appOrigin } from "@/lib/stripe";

type RazorpayCheckoutPrefill = {
  name: string;
  email: string;
  contact: string;
};

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
    name: "Healthify",
    description: "Healthify Pro subscription",
    image: `${appOrigin()}/icon.png`,
    prefill: args.prefill,
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
