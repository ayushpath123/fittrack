"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Activity, Droplets, Dumbbell, Scale, Sparkles, Utensils } from "lucide-react";
import type { ActivityFeedItem } from "@/lib/activity-timeline";

const iconFor = (kind: ActivityFeedItem["kind"]) => {
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

const toneFor = (kind: ActivityFeedItem["kind"]) => {
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

export function ActivityTimeline({ items }: { items: ActivityFeedItem[] }) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between px-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Activity timeline</p>
        <Link href="/activity" className="text-[10px] font-semibold text-[#B8E86A]">
          View all
        </Link>
      </div>

      {!items.length ? (
        <div className="rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.02] px-4 py-5 text-center text-[12px] text-[var(--muted)]">
          Your timeline fills as you log workouts, meals, and weight.
        </div>
      ) : (
        <div className="premium-card rounded-[var(--radius-card)] px-3 py-1">
          <div className="relative pl-1">
            <div
              className="absolute bottom-2 left-[17px] top-2 w-px bg-gradient-to-b from-[rgba(190,255,71,.35)] via-white/10 to-transparent"
              aria-hidden
            />
            <ul>
              {items.map((item, i) => {
                const Icon = iconFor(item.kind);
                return (
                  <motion.li
                    key={item.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.04 * i }}
                    className="relative"
                  >
                    <Link
                      href={item.href}
                      className="group flex gap-2.5 rounded-xl py-2 pr-1 transition-colors hover:bg-white/[0.03]"
                    >
                      <span
                        className="relative z-[1] mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.06]"
                        style={{ background: toneFor(item.kind) }}
                      >
                        <Icon size={14} className="text-[var(--white)] opacity-90" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1 border-b border-white/[0.05] pb-2 group-last:border-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[12px] font-semibold leading-snug text-[var(--white)]">{item.title}</p>
                          <span className="shrink-0 text-[9px] font-medium tabular-nums text-[var(--hint)]">{item.timeLabel}</span>
                        </div>
                        <p className="mt-0.5 text-[10px] text-[var(--muted)]">{item.meta}</p>
                      </div>
                    </Link>
                  </motion.li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
