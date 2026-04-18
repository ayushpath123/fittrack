import type { Metadata } from "next";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";

export const metadata: Metadata = {
  title: "Set Up Your Plan · FitTrack",
};

export default function OnboardingPage() {
  return <OnboardingFlow />;
}
