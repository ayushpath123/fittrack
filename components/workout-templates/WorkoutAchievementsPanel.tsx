"use client";

import type { WorkoutAchievement } from "@/types/workout";
import { cn } from "@/lib/utils";

type WorkoutAchievementsPanelProps = {
  achievements: WorkoutAchievement[];
};

export function WorkoutAchievementsPanel({ achievements }: WorkoutAchievementsPanelProps) {
  const unlocked = achievements.filter((a) => a.unlocked);

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Achievements</p>
      <div className="grid grid-cols-2 gap-2">
        {achievements.map((a) => (
          <div
            key={a.id}
            className={cn(
              "rounded-xl border px-3 py-2.5 text-center transition-opacity",
              a.unlocked
                ? "border-[#BEFF47]/25 bg-[rgba(190,255,71,.08)]"
                : "border-white/[0.06] bg-white/[0.02] opacity-50",
            )}
          >
            <span className="text-lg">{a.emoji}</span>
            <p className="mt-1 text-[10px] font-medium text-[var(--white)]">{a.label}</p>
          </div>
        ))}
      </div>
      {unlocked.length > 0 ? (
        <p className="text-center text-[10px] text-[var(--hint)]">
          {unlocked.length} of {achievements.length} unlocked
        </p>
      ) : null}
    </div>
  );
}
