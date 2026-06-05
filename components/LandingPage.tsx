import Link from "next/link";
import { AppBrand } from "@/components/AppBrand";
import {
  Activity,
  ArrowRight,
  Check,
  Download,
  Smartphone,
  Target,
  Utensils,
  Zap,
} from "lucide-react";

const heroBullets = [
  { icon: Zap, text: "One-tap meal templates — no food database hunt" },
  { icon: Target, text: "Daily calorie & protein targets that match your goal" },
  { icon: Smartphone, text: "Lightweight on mobile data — works in the browser" },
] as const;

const coreFeatures = [
  {
    icon: Utensils,
    title: "Template meals",
    desc: "Breakfast, lunch, snack, dinner presets sized to your macros — log in seconds.",
  },
  {
    icon: Target,
    title: "Today dashboard",
    desc: "See kcal left, streak, water, and weight at a glance when you open the app.",
  },
  {
    icon: Activity,
    title: "Train & weigh",
    desc: "Simple workouts and weekly weight trends when you are ready — not day-one noise.",
  },
] as const;

const guideSteps = [
  { n: "1", title: "Sign up in seconds", body: "Google one tap, or email + password — no phone required." },
  { n: "2", title: "30-second setup", body: "Pick goal + weight, then log your first meal in one tap." },
  { n: "3", title: "Come back tomorrow", body: "Today shows kcal left; tap green to log again." },
] as const;

export function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#08090F] text-white">
      <div className="pointer-events-none fixed -left-64 -top-64 h-[500px] w-[500px] rounded-full bg-[#BEFF47] opacity-[0.04] blur-[120px]" />
      <div className="pointer-events-none fixed -bottom-48 -right-48 h-[400px] w-[400px] rounded-full bg-[#4A7EFF] opacity-[0.05] blur-[100px]" />

      <header className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-4">
        <nav className="flex w-full max-w-md items-center justify-between rounded-2xl border border-white/[0.09] bg-[#0D0E16]/80 px-4 py-2.5 backdrop-blur-2xl">
          <AppBrand href="/" />
          <div className="flex items-center gap-1">
            <Link
              href="/login"
              className="rounded-xl px-3.5 py-2 text-xs font-medium text-white/50 transition-colors hover:text-white/90"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-xl bg-[#BEFF47] px-3.5 py-2 text-xs font-semibold text-[#06080A] transition-all hover:bg-[#CCFF5A] active:scale-[0.97]"
            >
              Get started
            </Link>
          </div>
        </nav>
      </header>

      <main className="relative z-[1] mx-auto max-w-4xl px-4 pb-20 pt-32 sm:pt-36">
        <section className="text-center">
          <p className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-[#BEFF47]/20 bg-[#BEFF47]/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B8E86A]">
            <Activity className="h-3 w-3" aria-hidden />
            Built for busy routines
          </p>

          <h1 className="mx-auto max-w-xl text-[clamp(2rem,5vw,3rem)] font-extrabold leading-[1.1] tracking-[-0.02em] text-white">
            Log meals in{" "}
            <span className="text-[#BEFF47]">one tap</span>
            <span className="block text-[clamp(1.25rem,3vw,1.75rem)] font-bold text-white/70">
              Built for Indian routines
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-md text-[13px] leading-relaxed text-white/40">
            Hit your calorie and protein targets without scrolling food databases. Approximate macros are fine — consistency
            beats perfection.
          </p>

          <ul className="mx-auto mt-8 max-w-sm space-y-2.5 text-left">
            {heroBullets.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-2.5 text-[13px] text-white/55">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#BEFF47]" aria-hidden />
                {text}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#BEFF47] px-6 py-3.5 text-sm font-semibold text-[#06080A] shadow-[0_8px_40px_rgba(190,255,71,.18)] transition-all hover:bg-[#CCFF5A] active:scale-[0.98]"
            >
              Start free
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/install-app"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-6 py-3.5 text-sm font-medium text-white/60 transition-colors hover:border-white/20 hover:text-white/90"
            >
              <Download className="h-4 w-4" aria-hidden />
              Install app
            </Link>
          </div>

          <div className="mt-12 flex items-center justify-center gap-8">
            {[
              { val: "Free", label: "full logging" },
              { val: "<60s", label: "first meal log" },
              { val: "Mobile", label: "first" },
            ].map(({ val, label }) => (
              <div key={label} className="text-center">
                <p className="text-lg font-bold text-white">{val}</p>
                <p className="mt-0.5 text-[11px] text-white/30">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="my-20 flex items-center gap-4">
          <div className="h-px flex-1 bg-white/[0.06]" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">Core loop</p>
          <div className="h-px flex-1 bg-white/[0.06]" />
        </div>

        <section id="features" className="scroll-mt-24">
          <div className="mb-10 text-center">
            <h2 className="text-xl font-bold text-white sm:text-2xl">Everything for the daily log habit</h2>
            <p className="mt-2 text-[13px] text-white/35">Barcode scan, AI coach, and leaderboards stay in More — after you build the habit.</p>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-3">
            {coreFeatures.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-[18px] border border-white/[0.06] bg-white/[0.025] p-5 transition-all hover:border-[#BEFF47]/20"
              >
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-[#BEFF47]/10">
                  <Icon className="h-4 w-4 text-[#BEFF47]" aria-hidden />
                </div>
                <h3 className="text-sm font-semibold text-white">{title}</h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/35">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="my-20 flex items-center gap-4">
          <div className="h-px flex-1 bg-white/[0.06]" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">How it works</p>
          <div className="h-px flex-1 bg-white/[0.06]" />
        </div>

        <section id="guides" className="scroll-mt-24">
          <div className="mx-auto max-w-xl space-y-2.5">
            {guideSteps.map(({ n, title, body }) => (
              <div
                key={n}
                className="flex gap-4 rounded-[18px] border border-white/[0.06] bg-white/[0.025] p-4 sm:p-5"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#BEFF47]/25 bg-[#BEFF47]/8 text-xs font-bold text-[#B8E86A]">
                  {n}
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-white">{title}</h3>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-white/38">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20 overflow-hidden rounded-[24px] border border-[#BEFF47]/15 bg-gradient-to-br from-[#BEFF47]/[0.07] to-transparent px-6 py-12 text-center sm:px-12">
          <p className="text-xl font-bold text-white">Start logging today</p>
          <p className="mt-2 text-[13px] text-white/38">Free account · no credit card · full macro logging</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            <Link
              href="/signup"
              className="inline-flex rounded-2xl bg-[#BEFF47] px-7 py-3 text-sm font-semibold text-[#06080A] shadow-[0_8px_32px_rgba(190,255,71,.2)] transition-all hover:bg-[#CCFF5A]"
            >
              Create account
            </Link>
            <Link
              href="/login"
              className="inline-flex rounded-2xl border border-white/12 px-7 py-3 text-sm font-medium text-white/60 transition-colors hover:border-white/20 hover:text-white"
            >
              Log in
            </Link>
          </div>
          <p className="mt-6 text-[11px] text-white/30">
            <Check className="mr-1 inline h-3.5 w-3.5 align-text-bottom text-[#2DD4A0]" aria-hidden />
            Pro adds AI photo estimates & coach — optional later
          </p>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/[0.06] py-8 text-center text-[11px] text-white/22">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4">
          <p>© {new Date().getFullYear()} FitTrack</p>
          <div className="flex gap-5">
            <Link href="/install-app" className="transition-colors hover:text-white/45">
              Install
            </Link>
            <Link href="/login" className="transition-colors hover:text-white/45">
              Log in
            </Link>
            <Link href="/signup" className="transition-colors hover:text-white/45">
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
