import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — FitTrack Pro",
  description: "Healthify Pro: AI meal estimates and agentic coach. Upgrade with Stripe.",
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
