"use client";

import Link from "next/link";
import { Award, Flame, Medal, Trophy } from "lucide-react";
import type { PersonalRecord } from "@/types/dashboard";

type AchievementSectionProps = {
  globalStreak: number;
  badges: string[];
  personalRecords: PersonalRecord[];
  weeklyGoalProgress: number;
  weeklyGoalTarget: number;
  level: number;
  rank: string;
};

export function AchievementSection({
  globalStreak,
  badges,
  personalRecords,
  weeklyGoalProgress,
  weeklyGoalTarget,
  level,
  rank,
}: AchievementSectionProps) {
  const monthlyPct = Math.min(100, Math.round((weeklyGoalProgress / Math.max(1, weeklyGoalTarget)) * 100));

  return (
    <section>
      <div className="mb-2 flex items-center justify-between px-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Achievements</p>
        <Link href="/game" className="text-[10px] font-semibold text-[#B8E86A]">
          Arena
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="premium-card min-w-[8.5rem] shrink-0 rounded-xl p-3">
          <Flame size={16} className="text-orange-400" aria-hidden />
          <p className="num mt-2 text-xl font-bold text-[var(--white)]">{globalStreak}</p>
          <p className="text-[10px] text-[var(--muted)]">Global streak</p>
        </div>

        <div className="premium-card min-w-[8.5rem] shrink-0 rounded-xl p-3">
          <Trophy size={16} className="text-[#BEFF47]" aria-hidden />
          <p className="num mt-2 text-xl font-bold text-[var(--white)]">Lv {level}</p>
          <p className="truncate text-[10px] text-[var(--muted)]">{rank}</p>
        </div>

        <div className="premium-card min-w-[8.5rem] shrink-0 rounded-xl p-3">
          <Medal size={16} className="text-[#57B4FF]" aria-hidden />
          <p className="num mt-2 text-xl font-bold text-[var(--white)]">{monthlyPct}%</p>
          <p className="text-[10px] text-[var(--muted)]">Monthly goal</p>
        </div>

        {badges.slice(0, 2).map((badge) => (
          <div key={badge} className="premium-card min-w-[8.5rem] shrink-0 rounded-xl p-3">
            <Award size={16} className="text-[#A78BFA]" aria-hidden />
            <p className="mt-2 text-[11px] font-semibold leading-snug text-[var(--white)]">{badge}</p>
            <p className="text-[10px] text-[var(--muted)]">Badge</p>
          </div>
        ))}

        {personalRecords.slice(0, 1).map((pr) => (
          <div key={pr.exercise} className="premium-card min-w-[9rem] shrink-0 rounded-xl p-3">
            <Award size={16} className="text-[#FFB547]" aria-hidden />
            <p className="mt-2 text-[11px] font-semibold text-[var(--white)]">{pr.exercise}</p>
            <p className="text-[10px] text-[var(--muted)]">
              PR {pr.weight} kg × {pr.reps}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
