import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { LandingPage } from "@/components/LandingPage";

export const metadata: Metadata = {
  title: "FitTrack — Meals, workouts & habits",
  description:
    "Track nutrition, training, weight, and water in one place. Sign in for a short onboarding, then your dashboard.",
};

export default async function Home() {
  const session = await getAuthSession();
  if (session?.user) {
    redirect("/dashboard");
  }
  return <LandingPage />;
}
