"use client";

import { AlertTriangle, Lightbulb, TrendingUp } from "lucide-react";
import type { HealthInsight } from "@/types/dashboard";

const toneConfig = {
  positive: {
    icon: TrendingUp,
    border: "border-[rgba(45,212,160,.22)]",
    bg: "bg-[rgba(45,212,160,.08)]",
    iconColor: "text-[#2DD4A0]",
  },
  neutral: {
    icon: Lightbulb,
    border: "border-white/[0.08]",
    bg: "bg-white/[0.03]",
    iconColor: "text-[#57B4FF]",
  },
  warning: {
    icon: AlertTriangle,
    border: "border-[rgba(255,181,71,.22)]",
    bg: "bg-[rgba(255,181,71,.08)]",
    iconColor: "text-[#FFB547]",
  },
} as const;

export function HealthInsights({ insights }: { insights: HealthInsight[] }) {
  return (
    <section>
      <p className="mb-2 px-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Health insights</p>
      <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {insights.map((insight) => {
          const config = toneConfig[insight.tone];
          const Icon = config.icon;
          return (
            <div
              key={insight.id}
              className={`min-w-[11.5rem] max-w-[14rem] shrink-0 rounded-xl border p-3 ${config.border} ${config.bg}`}
            >
              <Icon size={14} className={`mb-2 ${config.iconColor}`} aria-hidden />
              <p className="text-[11px] font-medium leading-snug text-[var(--white)]">{insight.message}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
