import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LandingPage } from "@/components/LandingPage";
import { getAuthSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "FitTrack — Meals, workouts & habits",
  description:
    "Track nutrition, training, weight, and water in one place.",
};

export default async function Home() {
  const session = await getAuthSession();
  if (session?.user) {
    redirect("/dashboard");
  }
  return <LandingPage />;
}
