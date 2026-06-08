"use client";

import { useState } from "react";
import type { WorkoutTemplateType } from "@/types/workout";
import { cn } from "@/lib/utils";

type WorkoutQuickLogCardProps = {
  template: WorkoutTemplateType;
  onLog: () => void;
  busy?: boolean;
  logged?: boolean;
};

export function WorkoutQuickLogCard({ template, onLog, busy, logged }: WorkoutQuickLogCardProps) {
  const [tapped, setTapped] = useState(false);

  function handleTap() {
    if (busy || logged) return;
    setTapped(true);
    window.setTimeout(() => setTapped(false), 500);
    onLog();
  }

  return (
    <button
      type="button"
      onClick={handleTap}
      disabled={busy || logged}
      className={cn(
        "w-[8.25rem] shrink-0 snap-center rounded-xl border bg-white/[0.04] p-2.5 text-left transition-all duration-200 active:scale-[0.98] disabled:opacity-45",
        tapped || busy
          ? "border-[#BEFF47] shadow-[0_0_0_1px_#BEFF47,0_0_14px_rgba(190,255,71,0.35)]"
          : "border-white/[0.08] shadow-none",
        logged && "border-white/[0.06] shadow-none",
      )}
    >
      <p className="line-clamp-1 text-[11px] font-semibold text-[var(--white)]">
        {template.icon ? <span className="mr-0.5">{template.icon}</span> : null}
        {template.name}
      </p>
      <p className="num mt-1 text-sm font-bold leading-none text-[#BEFF47]">{template.caloriesBurned}</p>
      <p className="mt-0.5 text-[9px] leading-tight text-[var(--muted)]">
        {logged ? "Logged today" : busy ? "Logging…" : `${template.duration} min · tap`}
      </p>
    </button>
  );
}
