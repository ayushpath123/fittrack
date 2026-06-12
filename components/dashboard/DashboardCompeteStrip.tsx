"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Flame, Gem, Medal, Shield, Sparkles, Trophy } from "lucide-react";

export type CompeteStripPayload = {
  globalStreak: number;
  xp: number;
  rank: string;
  level: number;
  xpEarnedToday: number;
  weeklyConsistencyPct: number;
  badges: string[];
  leaderboard?: {
    globalRank: number;
    totalRanked: number;
    percentile: number;
    seasonKey: string;
  } | null;
};

export function DashboardCompeteStrip({ data }: { data: CompeteStripPayload }) {
  const { globalStreak, xp, rank, level, xpEarnedToday, weeklyConsistencyPct, badges, leaderboard } = data;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden rounded-2xl border border-white/[0.1] bg-[linear-gradient(110deg,rgba(190,255,71,.09)_0%,rgba(87,180,255,.06)_55%,rgba(167,139,250,.05)_100%)] shadow-[0_12px_40px_rgba(0,0,0,.28)] transition-[border-color,box-shadow] hover:border-[rgba(190,255,71,.22)] hover:shadow-[0_14px_44px_rgba(0,0,0,.34)]"
    >
      <Link href="/game" className="group flex items-center justify-between gap-2 p-3 transition-colors hover:bg-white/[0.03]">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[rgba(190,255,71,.12)] text-[#BEFF47]">
            <Trophy size={17} strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Arena</p>
            <p className="truncate text-[12px] font-semibold text-[var(--white)]">
              {rank} · Lvl {level}
            </p>
          </div>
        </div>
        <ChevronRight size={16} className="shrink-0 text-[var(--hint)] transition-transform group-hover:translate-x-0.5" />
      </Link>

      {leaderboard ? (
        <Link
          href="/leaderboards"
          className="block border-t border-white/[0.08] bg-black/15 px-3 py-2 transition-colors hover:bg-black/25"
        >
          <p className="flex items-center justify-between gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1 font-semibold text-[#FFCF80]">
              <Medal size={12} aria-hidden />
              Global #{leaderboard.globalRank}
            </span>
            <span className="num font-bold text-[var(--white)]">Top {leaderboard.percentile}%</span>
          </p>
          <p className="mt-0.5 text-[9px] text-[var(--hint)]">Season {leaderboard.seasonKey} · {leaderboard.totalRanked} ranked</p>
        </Link>
      ) : null}

      <Link href="/game" className="block border-t border-white/[0.06] p-3 pt-3 transition-colors hover:bg-white/[0.03]">
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              <Flame size={11} className="text-[#FFB547]" aria-hidden />
              Streak
            </span>
            <span className="num text-lg font-bold leading-none text-[var(--white)]">{globalStreak}d</span>
          </div>
          <div className="flex flex-col gap-0.5 border-x border-white/[0.06] px-2 text-center">
            <span className="flex items-center justify-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              <Gem size={11} className="text-[#7DD3FC]" aria-hidden />
              XP
            </span>
            <span className="num text-lg font-bold leading-none text-[var(--white)]">{xp.toLocaleString()}</span>
          </div>
          <div className="flex flex-col gap-0.5 text-right">
            <span className="flex items-center justify-end gap-1 text-[9px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              <Shield size={11} className="text-[#86EFAC]" aria-hidden />
              Week
            </span>
            <span className="num text-lg font-bold leading-none text-[#86EFAC]">{weeklyConsistencyPct}%</span>
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {xpEarnedToday > 0 ? (
            <motion.span
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 22 }}
              className="inline-flex items-center gap-1 rounded-full border border-[rgba(190,255,71,.28)] bg-[rgba(190,255,71,.1)] px-2 py-0.5 text-[10px] font-semibold text-[#D6FF9C]"
            >
              <Sparkles size={11} className="text-[#BEFF47]" aria-hidden />+{xpEarnedToday} XP today
            </motion.span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-[var(--muted)]">
              Complete quests for XP
            </span>
          )}
          {badges.slice(0, 3).map((b) => (
            <span
              key={b}
              className="inline-flex max-w-[9.5rem] truncate rounded-full border border-[rgba(167,139,250,.22)] bg-[rgba(167,139,250,.08)] px-2 py-0.5 text-[10px] font-medium text-[#DDD6FE]"
              title={b}
            >
              {b}
            </span>
          ))}
        </div>
      </Link>
    </motion.div>
  );
}
