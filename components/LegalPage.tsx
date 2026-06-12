import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { AppBrand } from "@/components/AppBrand";

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-white">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-white/65 [&_a]:text-[#B8E86A] [&_a]:underline [&_li]:ml-4 [&_li]:list-disc [&_ul]:space-y-1">
        {children}
      </div>
    </section>
  );
}

export function LegalPage({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#08090F] text-white">
      <div className="pointer-events-none absolute -left-48 -top-48 h-96 w-96 rounded-full bg-[#BEFF47] opacity-[0.045] blur-[100px]" />

      <header className="relative z-10 border-b border-white/[0.08] bg-[#08090F]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3.5">
          <AppBrand href="/" />
          <Link
            href="/"
            className="inline-flex items-center gap-1 rounded-xl border border-[rgba(255,255,255,.1)] px-2.5 py-1.5 text-xs text-white/55 transition-colors hover:text-white/90"
          >
            <ChevronLeft size={13} />
            Home
          </Link>
        </div>
      </header>

      <main className="relative z-[1] mx-auto max-w-3xl px-4 pb-16 pt-10">
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        <p className="mt-1 text-xs text-white/40">Last updated: {lastUpdated}</p>
        <div className="mt-8 space-y-8">{children}</div>
      </main>

      <footer className="relative z-10 border-t border-white/[0.08] py-6 text-center text-[11px] text-white/30">
        <div className="flex items-center justify-center gap-4">
          <Link href="/terms" className="transition-colors hover:text-white/60">
            Terms
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-white/60">
            Privacy
          </Link>
          <Link href="/refunds" className="transition-colors hover:text-white/60">
            Refunds
          </Link>
        </div>
        <p className="mt-3">© {new Date().getFullYear()} FitTrack</p>
      </footer>
    </div>
  );
}
