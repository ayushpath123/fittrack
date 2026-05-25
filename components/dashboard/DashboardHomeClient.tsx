"use client";

import Link from "next/link";
import { Dumbbell, Utensils } from "lucide-react";
import { DashboardHeroRings, type HeroRingSpec } from "@/components/dashboard/DashboardHeroRings";
import { DashboardCompeteStrip, type CompeteStripPayload } from "@/components/dashboard/DashboardCompeteStrip";
import { DashboardRewardTeasers } from "@/components/dashboard/DashboardRewardTeasers";
import { DashboardActivityFeed } from "@/components/dashboard/DashboardActivityFeed";
import type { ActivityFeedItem } from "@/lib/activity-timeline";
import { GameModeHint } from "@/components/GameModeHint";

export type DashboardHomeClientProps = {
  rings: HeroRingSpec[];
  compete: CompeteStripPayload;
  teasers: string[];
  timeline: ActivityFeedItem[];
};

export function DashboardHomeClient({ rings, compete, teasers, timeline }: DashboardHomeClientProps) {
  return (
    <div>
      <DashboardHeroRings rings={rings} />
      <DashboardCompeteStrip data={compete} />
      <DashboardRewardTeasers lines={teasers} />

      <div className="mb-3 grid grid-cols-2 gap-2">
        {[
          { href: "/meals?action=log", icon: Utensils, label: "Log meal" },
          { href: "/workout?action=start", icon: Dumbbell, label: "Workout" },
        ].map(({ href, icon: Icon, label }) => (
          <Link
            key={label}
            href={href}
            className="premium-card flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 transition-transform active:scale-95"
          >
            <Icon size={15} className="shrink-0 text-[#BEFF47]" />
            <span className="text-[11px] font-semibold text-[var(--white)]">{label}</span>
          </Link>
        ))}
      </div>

      <Link
        href="/weight?action=log"
        className="mb-3 inline-flex w-full min-h-10 items-center justify-center rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2.5 text-xs font-semibold text-[var(--muted)] transition-colors hover:border-[rgba(190,255,71,.25)] hover:text-[#B8E86A]"
      >
        Log weight
      </Link>

      <GameModeHint />

      <DashboardActivityFeed items={timeline} />
    </div>
  );
}
