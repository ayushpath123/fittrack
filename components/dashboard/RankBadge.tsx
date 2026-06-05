import Link from "next/link";
import { Trophy } from "lucide-react";

export function RankBadge({ level, rank }: { level: number; rank: string }) {
  return (
    <Link
      href="/game"
      className="inline-flex min-h-8 items-center gap-1.5 rounded-xl border border-[rgba(190,255,71,.28)] bg-[rgba(190,255,71,.1)] px-2.5 py-1.5 transition-transform active:scale-95"
      title={`Level ${level} · ${rank}`}
    >
      <Trophy size={13} className="shrink-0 text-[#BEFF47]" aria-hidden />
      <span className="num text-[11px] font-bold leading-none text-[var(--white)]">{rank}</span>
      <span className="text-[10px] font-semibold text-[var(--muted)]">Lv {level}</span>
    </Link>
  );
}
