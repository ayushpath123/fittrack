"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PremiumStatRing } from "@/components/dashboard/PremiumStatRing";

export type HeroRingSpec = {
  id: string;
  label: string;
  centerValue: string;
  centerUnit?: string;
  pct: number;
  gradientFrom: string;
  gradientTo: string;
  overAccent?: boolean;
};

export function DashboardHeroRings({ rings }: { rings: HeroRingSpec[] }) {
  return (
    <div className="mb-4 rounded-[22px] border border-white/[0.09] bg-[linear-gradient(165deg,rgba(255,255,255,.06)_0%,rgba(255,255,255,.015)_45%,rgba(8,10,18,.4)_100%)] p-3 shadow-[0_20px_50px_rgba(0,0,0,.32)] backdrop-blur-xl">
      <div className="mb-2 flex items-end justify-between gap-2 px-0.5">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Live vitals</p>
          <p className="mt-0.5 text-[11px] text-[var(--hint)]">Calories · Protein · Water</p>
        </div>
        <Link
          href="/analytics"
          className="inline-flex shrink-0 items-center gap-0.5 rounded-lg py-1 pl-2 text-[10px] font-semibold uppercase tracking-widest text-[#B8E86A] transition-colors hover:text-[#BEFF47]"
        >
          Stats
          <ChevronRight size={12} className="opacity-70" aria-hidden />
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-x-1 gap-y-0 sm:gap-x-3">
        {rings.map((ring, i) => (
          <PremiumStatRing
            key={ring.id}
            label={ring.label}
            centerValue={ring.centerValue}
            centerUnit={ring.centerUnit}
            pct={ring.pct}
            gradientFrom={ring.gradientFrom}
            gradientTo={ring.gradientTo}
            delay={i * 0.07}
            overAccent={ring.overAccent}
          />
        ))}
      </div>
    </div>
  );
}

