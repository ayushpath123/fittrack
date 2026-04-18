import Link from "next/link";
import { AppBrand } from "@/components/AppBrand";
import {
  Activity,
  ArrowRight,
  BarChart2,
  BookOpen,
  Camera,
  Check,
  Dumbbell,
  Droplets,
  Sparkles,
  Utensils,
} from "lucide-react";

const features = [
  {
    icon: Utensils,
    title: "Meals & macros",
    desc: "Log food, scan barcodes, and use AI photo estimates to stay on target.",
  },
  {
    icon: Dumbbell,
    title: "Workouts",
    desc: "Track sessions, sets, and progress without leaving your flow.",
  },
  {
    icon: BarChart2,
    title: "Analytics",
    desc: "Trends, adherence, and weekly insights at a glance.",
  },
  {
    icon: Sparkles,
    title: "AI coach",
    desc: "Ask questions grounded in your logs and goals (Pro).",
  },
  {
    icon: Camera,
    title: "Smart tools",
    desc: "Barcode lookup, hydration, weight — one app for the full picture.",
  },
  {
    icon: Droplets,
    title: "Hydration",
    desc: "Daily water goals that match your body and routine.",
  },
] as const;

const guideSteps = [
  { n: "1", title: "Create an account", body: "Sign up with email or Google — quick and secure." },
  { n: "2", title: "Finish onboarding", body: "Set weight, height, and goal so targets match you." },
  { n: "3", title: "Build the habit", body: "Log meals and workouts — the dashboard fills in automatically." },
] as const;

export function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#08090F] text-white">
      {/* Ambient glows */}
      <div className="pointer-events-none fixed -left-64 -top-64 h-[500px] w-[500px] rounded-full bg-[#BEFF47] opacity-[0.04] blur-[120px]" />
      <div className="pointer-events-none fixed -bottom-48 -right-48 h-[400px] w-[400px] rounded-full bg-[#4A7EFF] opacity-[0.05] blur-[100px]" />

      {/* ── Navbar: floating pill ── */}
      <header className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-4">
        <nav className="flex w-full max-w-md items-center justify-between rounded-2xl border border-white/[0.09] bg-[#0D0E16]/80 px-4 py-2.5 backdrop-blur-2xl">
          {/* Logo */}
          <AppBrand href="/" />

          {/* Actions */}
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

        {/* ── Hero ── */}
        <section className="text-center">
          <p className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-[#BEFF47]/20 bg-[#BEFF47]/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B8E86A]">
            <Activity className="h-3 w-3" aria-hidden />
            Your data, your pace
          </p>

          <h1 className="mx-auto max-w-xl text-[clamp(2rem,5vw,3rem)] font-extrabold leading-[1.1] tracking-[-0.02em] text-white">
            Track nutrition,{" "}
            <span className="text-[#BEFF47]">training</span>, and habits
          </h1>

          <p className="mx-auto mt-5 max-w-sm text-[13px] leading-relaxed text-white/40">
            Log meals, workouts, weight, and water — then surface trends so you can adjust without guesswork.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#BEFF47] px-6 py-3.5 text-sm font-semibold text-[#06080A] shadow-[0_8px_40px_rgba(190,255,71,.18)] transition-all hover:bg-[#CCFF5A] hover:shadow-[0_12px_48px_rgba(190,255,71,.25)] active:scale-[0.98]"
            >
              Create free account
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-6 py-3.5 text-sm font-medium text-white/60 transition-colors hover:border-white/20 hover:text-white/90"
            >
              I have an account
            </Link>
          </div>

          {/* Subtle stat strip */}
          <div className="mt-12 flex items-center justify-center gap-8">
            {[
              { val: "Free", label: "to start" },
              { val: "6+", label: "tracking tools" },
              { val: "AI", label: "coach (Pro)" },
            ].map(({ val, label }) => (
              <div key={label} className="text-center">
                <p className="text-lg font-bold text-white">{val}</p>
                <p className="mt-0.5 text-[11px] text-white/30">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Divider ── */}
        <div className="my-20 flex items-center gap-4">
          <div className="h-px flex-1 bg-white/[0.06]" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">Product</p>
          <div className="h-px flex-1 bg-white/[0.06]" />
        </div>

        {/* ── Features ── */}
        <section id="features" className="scroll-mt-24">
          <div className="mb-10 text-center">
            <h2 className="text-xl font-bold text-white sm:text-2xl">
              Everything you need to stay consistent
            </h2>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="group rounded-[18px] border border-white/[0.06] bg-white/[0.025] p-5 transition-all hover:border-[#BEFF47]/20 hover:bg-white/[0.04]"
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

        {/* ── Divider ── */}
        <div className="my-20 flex items-center gap-4">
          <div className="h-px flex-1 bg-white/[0.06]" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">Pricing</p>
          <div className="h-px flex-1 bg-white/[0.06]" />
        </div>

        {/* ── Pricing ── */}
        <section id="pricing" className="scroll-mt-24">
          <div className="mb-10 text-center">
            <h2 className="text-xl font-bold text-white sm:text-2xl">
              Start free, upgrade when you want AI
            </h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {/* Free */}
            <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.025] p-6 sm:p-7">
              <div className="flex items-baseline justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Free</p>
                <p className="text-2xl font-extrabold text-white">$0</p>
              </div>
              <div className="my-4 h-px bg-white/[0.06]" />
              <ul className="space-y-2.5">
                {["Dashboard, meals, workouts, weight", "Calendar & stats", "Hydration tracking"].map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-[13px] text-white/45">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2DD4A0]" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="mt-6 flex w-full items-center justify-center rounded-xl border border-white/10 py-2.5 text-sm font-semibold text-white/70 transition-colors hover:border-white/20 hover:text-white"
              >
                Get started
              </Link>
            </div>

            {/* Pro */}
            <div className="relative overflow-hidden rounded-[22px] border border-[#BEFF47]/20 bg-[#BEFF47]/[0.04] p-6 sm:p-7">
              <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#BEFF47] opacity-[0.06] blur-[40px]" />
              <div className="flex items-baseline justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#B8E86A]">Pro</p>
                <p className="text-2xl font-extrabold text-white">AI-powered</p>
              </div>
              <div className="my-4 h-px bg-[#BEFF47]/10" />
              <ul className="space-y-2.5">
                {["AI meal photo estimates", "Agentic coach with your data", "Fair-use limits per account"].map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-[13px] text-white/60">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#BEFF47]" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
              <Link
                href="/pricing"
                className="mt-6 flex w-full items-center justify-center rounded-xl bg-[#BEFF47] py-2.5 text-sm font-semibold text-[#06080A] transition-all hover:bg-[#CCFF5A] active:scale-[0.99]"
              >
                View Pro details
              </Link>
            </div>
          </div>
        </section>

        {/* ── Divider ── */}
        <div className="my-20 flex items-center gap-4">
          <div className="h-px flex-1 bg-white/[0.06]" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">Guide</p>
          <div className="h-px flex-1 bg-white/[0.06]" />
        </div>

        {/* ── How it works ── */}
        <section id="guides" className="scroll-mt-24">
          <div className="mb-10 text-center">
            <h2 className="text-xl font-bold text-white sm:text-2xl">
              How it works after you sign in
            </h2>
          </div>
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
          <p className="mt-7 text-center text-[12px] text-white/30">
            <BookOpen className="mr-1 inline h-3.5 w-3.5 align-text-bottom text-[#BEFF47]/60" aria-hidden />
            Tip: tweak targets anytime in{" "}
            <span className="text-white/45">Settings → Goals</span>
          </p>
        </section>

        {/* ── CTA ── */}
        <section className="mt-20 overflow-hidden rounded-[24px] border border-[#BEFF47]/15 bg-gradient-to-br from-[#BEFF47]/[0.07] to-transparent px-6 py-12 text-center sm:px-12">
          <p className="text-xl font-bold text-white">Ready when you are</p>
          <p className="mt-2 text-[13px] text-white/38">
            Sign in to continue, or create an account to start onboarding.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            <Link
              href="/signup"
              className="inline-flex rounded-2xl bg-[#BEFF47] px-7 py-3 text-sm font-semibold text-[#06080A] shadow-[0_8px_32px_rgba(190,255,71,.2)] transition-all hover:bg-[#CCFF5A]"
            >
              Sign up free
            </Link>
            <Link
              href="/login"
              className="inline-flex rounded-2xl border border-white/12 px-7 py-3 text-sm font-medium text-white/60 transition-colors hover:border-white/20 hover:text-white"
            >
              Log in
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/[0.06] py-8 text-center text-[11px] text-white/22">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4">
          <p>© {new Date().getFullYear()} FitTrack</p>
          <div className="flex gap-5">
            <Link href="/pricing" className="transition-colors hover:text-white/45">Pricing</Link>
            <Link href="/login" className="transition-colors hover:text-white/45">Log in</Link>
            <Link href="/signup" className="transition-colors hover:text-white/45">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}