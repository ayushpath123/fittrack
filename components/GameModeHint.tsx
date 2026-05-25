"use client";

import Link from "next/link";
import { ChevronRight, Trophy } from "lucide-react";
import { useEffect, useState } from "react";

export function GameModeHint() {
  const [play, setPlay] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setPlay(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <Link
      href="/game"
      className={
        "card-entrance staggered mb-3 flex min-h-12 items-center gap-3 rounded-2xl border border-[rgba(190,255,71,.28)] bg-[linear-gradient(135deg,rgba(190,255,71,.14)_0%,rgba(87,180,255,.08)_100%)] px-3.5 py-3 shadow-[0_0_24px_-8px_rgba(190,255,71,.35)] transition-transform active:scale-[0.99] " +
        (play ? "game-hint-pop" : "")
      }
      style={{ ["--stagger-base" as string]: "0ms", ["--stagger-index" as string]: "1.5" }}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[rgba(190,255,71,.18)] text-[#BEFF47]">
        <Trophy size={18} strokeWidth={2.25} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-bold uppercase tracking-[0.12em] text-[#B8E86A]">Game</span>
        <span className="mt-0.5 block text-[12px] font-semibold leading-tight text-[var(--white)]">
          Streaks, quests & rewards — tap to play
        </span>
      </span>
      <ChevronRight size={18} className="shrink-0 text-[#BEFF47]/70" aria-hidden />
    </Link>
  );
}
