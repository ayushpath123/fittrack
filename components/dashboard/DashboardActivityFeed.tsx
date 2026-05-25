"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Activity, Droplets, Dumbbell, Scale, Sparkles, Utensils } from "lucide-react";
import type { ActivityFeedItem } from "@/lib/activity-timeline";

export type FeedItem = ActivityFeedItem;

const iconFor = (kind: FeedItem["kind"]) => {
  switch (kind) {
    case "meal":
      return Utensils;
    case "workout":
      return Dumbbell;
    case "weight":
      return Scale;
    case "hydration":
      return Droplets;
    case "xp":
      return Sparkles;
    default:
      return Activity;
  }
};

const toneFor = (kind: FeedItem["kind"]) => {
  switch (kind) {
    case "meal":
      return "rgba(190,255,71,.16)";
    case "workout":
      return "rgba(255,181,71,.16)";
    case "weight":
      return "rgba(167,139,250,.16)";
    case "hydration":
      return "rgba(87,180,255,.16)";
    case "xp":
      return "rgba(190,255,71,.2)";
    default:
      return "rgba(255,255,255,.08)";
  }
};

export function DashboardActivityFeed({ items }: { items: FeedItem[] }) {
  if (!items.length) {
    return (
      <div className="mb-3 rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.02] px-4 py-6 text-center text-[12px] text-[var(--muted)]">
        Your timeline will fill as you log meals, workouts, and weight.
      </div>
    );
  }

  return (
    <div className="mb-3">
      <div className="mb-2 flex items-center justify-between px-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Activity</p>
      </div>
      <div className="relative pl-2">
        <div className="absolute bottom-2 left-[19px] top-2 w-px bg-gradient-to-b from-[rgba(190,255,71,.35)] via-white/10 to-transparent" aria-hidden />
        <ul className="divide-y divide-white/[0.06]">
          {items.map((item, i) => {
            const Icon = iconFor(item.kind);
            return (
              <motion.li
                key={item.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: 0.08 * i }}
                className="relative"
              >
                <Link
                  href={item.href}
                  className="group flex gap-3 rounded-xl py-2.5 pl-1 pr-2 transition-colors hover:bg-white/[0.03]"
                >
                  <span
                    className="relative z-[1] mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.06]"
                    style={{ background: toneFor(item.kind) }}
                  >
                    <Icon size={16} className="text-[var(--white)] opacity-90" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1 pb-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-semibold leading-snug text-[var(--white)] group-hover:text-[#E8FFE0]">{item.title}</p>
                      <span className="shrink-0 text-[10px] font-medium tabular-nums text-[var(--hint)]">{item.timeLabel}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-[var(--muted)]">{item.meta}</p>
                  </div>
                </Link>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
