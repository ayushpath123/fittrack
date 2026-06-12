import type { Metadata } from "next";
import { DM_Sans, Syne } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { AppShell } from "@/components/AppShell";
import { appOrigin } from "@/lib/stripe";

const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-display",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  metadataBase: new URL(appOrigin()),
  title: "FitTrack — Meals, workouts & habits",
  description:
    "Track nutrition, training, weight, and water in one place — with AI meal photo estimates and an agentic coach.",
  applicationName: "FitTrack",
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    siteName: "FitTrack",
    title: "FitTrack — Meals, workouts & habits",
    description:
      "Track nutrition, training, weight, and water in one place — with AI meal photo estimates and an agentic coach.",
  },
  twitter: {
    card: "summary_large_image",
    title: "FitTrack — Meals, workouts & habits",
    description: "Track nutrition, training, weight, and water in one place.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${syne.variable} ${dmSans.variable} dark`}>
      <body
        className={`${dmSans.className} min-h-screen bg-[var(--bg)] text-[var(--white)] antialiased`}
      >
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
