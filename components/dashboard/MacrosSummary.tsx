"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { MacroSnapshot } from "@/lib/meal-templates";

type MacrosSummaryProps = {
  totals: MacroSnapshot;
  targets: MacroSnapshot;
};

function MacroRow({ label, current, target, color }: { label: string; current: number; target: number; color: string }) {
  const pct = Math.min(100, Math.round((current / Math.max(1, target)) * 100));

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold text-[var(--white)]">{label}</span>
        <span className="num text-[11px] text-[var(--muted)]">
          {Math.round(current)} / {target}g
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export function MacrosSummary({ totals, targets }: MacrosSummaryProps) {
  return (
    <section className="premium-card rounded-[var(--radius-card)] p-3.5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Macros</p>
        <Link href="/meals" className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#B8E86A]">
          Details
          <ChevronRight size={12} aria-hidden />
        </Link>
      </div>
      <div className="space-y-3">
        <MacroRow label="Carbs" current={totals.carbs} target={targets.carbs} color="#BEFF47" />
        <MacroRow label="Fat" current={totals.fat} target={targets.fat} color="#FFB547" />
      </div>
    </section>
  );
}
