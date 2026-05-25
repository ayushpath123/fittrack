"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarCheck2, Crown, Shield, Sparkles, Swords, Trophy } from "lucide-react";
import { GamificationPanel } from "@/components/GamificationPanel";
import { InsightCallout } from "@/components/InsightCallout";
import { SectionHeader } from "@/components/SectionHeader";
import type { GamificationSummary } from "@/lib/gamification";

export function GameModeClient() {
  const [summary, setSummary] = useState<GamificationSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/gamification/summary", { credentials: "include" });
        if (!res.ok) return;
        const payload = (await res.json()) as GamificationSummary;
        if (mounted) setSummary(payload);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const rewardTrack = useMemo(() => {
    if (!summary) return [];
    return Array.from({ length: 6 }, (_, idx) => {
      const level = Math.max(1, summary.level - 2 + idx);
      const unlocked = level <= summary.level;
      return {
        slot: idx,
        level,
        unlocked,
        reward: level % 3 === 0 ? "Freeze charge" : level % 2 === 0 ? "XP token" : "Coin chest",
      };
    });
  }, [summary]);

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Full game mode"
        title="Quest Arena"
        subtitle="Complete quests, defeat weekly bosses, and climb your rank."
        action={
          <Link
            href="/dashboard"
            className="inline-flex min-h-10 items-center rounded-xl border border-[rgba(190,255,71,.3)] bg-[rgba(190,255,71,.1)] px-3 py-1.5 text-xs font-semibold text-[#B8E86A]"
          >
            Back
          </Link>
        }
      />

      <GamificationPanel />

      {loading || !summary ? (
        <div className="premium-card h-32 animate-pulse rounded-2xl" aria-hidden />
      ) : (
        <>
          <div className="premium-card rounded-2xl p-4">
            <div className="mb-2 flex items-center gap-2">
              <Crown size={14} className="text-[#FFCF80]" />
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)]">Reward track</p>
            </div>
            <div className="space-y-2">
              {rewardTrack.map((item) => (
                <div
                  key={`reward-track-${item.slot}`}
                  className={`flex min-h-11 items-center justify-between rounded-xl border px-3 py-2 ${
                    item.unlocked
                      ? "border-[rgba(45,212,160,.35)] bg-[rgba(45,212,160,.12)]"
                      : "border-white/[0.08] bg-white/[0.03]"
                  }`}
                >
                  <p className="text-sm font-semibold text-[var(--white)]">Level {item.level}</p>
                  <p className="text-xs text-[var(--muted)]">{item.reward}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="premium-card rounded-2xl p-4">
            <div className="mb-2 flex items-center gap-2">
              <CalendarCheck2 size={14} className="text-[#8AD4FF]" />
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)]">Mission history</p>
            </div>
            <div className="space-y-2">
              {summary.quests.map((quest) => (
                <div key={quest.id} className="flex min-h-11 items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2">
                  <p className={`text-xs ${quest.completed ? "text-[#6EECC4]" : "text-[var(--white)]"}`}>{quest.label}</p>
                  <span className={`text-[10px] font-semibold ${quest.completed ? "text-[#2DD4A0]" : "text-[var(--muted)]"}`}>
                    {quest.completed ? "Complete" : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="premium-card rounded-2xl p-4">
            <div className="mb-2 flex items-center gap-2">
              <Swords size={14} className="text-[#D8CBFF]" />
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)]">Seasonal event</p>
            </div>
            <p className="text-sm text-[var(--white)]">Storm of Consistency - Week 1</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Hold a {Math.max(7, summary.globalStreak + 2)}-day global streak this season to unlock the exclusive
              title <span className="font-semibold text-[#B8E86A]">Iron Focus</span>.
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-2 text-center">
                <p className="text-[9px] uppercase tracking-wide text-[var(--muted)]">Rank</p>
                <p className="num mt-0.5 text-sm font-bold text-[var(--white)]">{summary.rank}</p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-2 text-center">
                <p className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wide text-[var(--muted)]">
                  <Shield size={10} />
                  Rank shields
                </p>
                <p className="num mt-0.5 text-sm font-bold text-[var(--white)]">{summary.streakFreezeCharges}</p>
                <p className="mt-0.5 text-[8px] leading-tight text-[var(--muted)]">From level and adherence</p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-2 text-center">
                <p className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wide text-[var(--muted)]">
                  <Trophy size={10} />
                  Best
                </p>
                <p className="num mt-0.5 text-sm font-bold text-[var(--white)]">{summary.bestGlobalStreak}d</p>
              </div>
            </div>
          </div>
        </>
      )}

      <InsightCallout
        title="Play loop"
        body="Do daily quests, keep your streak alive, spend rewards smartly, and push your best streak every week."
        icon={<Sparkles size={14} />}
      />
    </div>
  );
}
