import Link from "next/link";
import { Crown, Medal, Sparkles, Trophy } from "lucide-react";
import { requireUserId } from "@/lib/auth";
import { loadGamificationSummaryForUser } from "@/lib/gamification-load";
import { fetchLeaderboardTop, getCurrentSeasonKey, syncLeaderboardAndGetStandings } from "@/lib/leaderboard";
import { prisma } from "@/lib/prisma";
import { SectionHeader } from "@/components/SectionHeader";

function tierStyle(rank: number) {
  if (rank === 1) return "from-[#FFD700]/25 to-[#B8860B]/10 border-[#FFD700]/35";
  if (rank === 2) return "from-[#E8E8E8]/20 to-white/5 border-white/25";
  if (rank === 3) return "from-[#CD7F32]/22 to-[#8B4513]/08 border-[#CD7F32]/35";
  return "from-white/[0.04] to-transparent border-white/[0.08]";
}

export default async function LeaderboardsPage() {
  const userId = await requireUserId();
  const seasonKey = getCurrentSeasonKey();
  const summary = await loadGamificationSummaryForUser(userId);
  const standings = await syncLeaderboardAndGetStandings(prisma, userId, summary.xp);
  const top = await fetchLeaderboardTop(prisma, seasonKey, { take: 100, viewerUserId: userId });
  const podium = top.slice(0, 3);
  const rest = top.slice(3);

  return (
    <div className="flex min-h-[calc(100dvh-var(--app-header-h)-var(--app-bottom-nav-h)-1.25rem)] flex-col pb-2">
      <SectionHeader
        className="mb-3"
        eyebrow={`Season ${seasonKey}`}
        title="Global ranks"
        subtitle="Monthly XP ladder among everyone who opened the app this season. Log meals and quests to climb."
        action={
          <Link
            href="/game"
            className="inline-flex min-h-9 items-center rounded-xl border border-[rgba(190,255,71,.3)] bg-[rgba(190,255,71,.1)] px-3 py-2 text-[11px] font-semibold text-[#B8E86A]"
          >
            Arena
          </Link>
        }
      />

      {standings ? (
        <div className="mb-4 rounded-2xl border border-[rgba(190,255,71,.22)] bg-[linear-gradient(135deg,rgba(190,255,71,.12)_0%,rgba(87,180,255,.08)_100%)] px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Your standing</p>
              <p className="num mt-1 text-3xl font-bold text-[var(--white)]">#{standings.globalRank}</p>
              <p className="mt-1 text-[12px] text-[var(--muted)]">
                of {standings.totalRanked.toLocaleString()} tracked · top {standings.percentile}% this season
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">XP</p>
              <p className="num mt-0.5 text-xl font-bold text-[#BEFF47]">{summary.xp.toLocaleString()}</p>
              <p className="text-[11px] text-[var(--hint)]">Lvl {summary.level}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-[12px] text-amber-100/95">
          Leaderboard sync is unavailable (database may need migration). Run{" "}
          <code className="rounded bg-black/30 px-1 py-0.5 text-[11px]">npx prisma migrate dev</code>.
        </div>
      )}

      <div className="mb-2 flex items-center gap-2 px-0.5">
        <Medal size={14} className="text-[#FFCF80]" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Podium</p>
      </div>
      {top.length === 0 ? (
        <div className="mb-4 rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] px-4 py-8 text-center text-[13px] text-[var(--muted)]">
          No scores this season yet. Log meals, complete quests in Arena, and refresh — your XP posts to the ladder automatically.
        </div>
      ) : (
        <div className="mb-4 grid grid-cols-3 gap-2">
          {podium.map((row) => (
            <div
              key={row.userId}
              className={`flex flex-col items-center rounded-2xl border bg-gradient-to-b px-2 py-3 text-center ${tierStyle(row.rank)}`}
            >
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">#{row.rank}</span>
              {row.rank === 1 ? <Crown className="mt-1 text-[#FFD700]" size={22} /> : null}
              {row.rank === 2 ? <Medal className="mt-1 text-[#E5E7EB]" size={22} /> : null}
              {row.rank === 3 ? <Medal className="mt-1 text-[#CD7F32]" size={22} /> : null}
              <p className={`mt-2 max-w-full truncate text-[11px] font-semibold ${row.isYou ? "text-[#BEFF47]" : "text-[var(--white)]"}`}>
                {row.displayName}
                {row.isYou ? " · you" : ""}
              </p>
              <p className="num mt-0.5 text-sm font-bold text-[var(--white)]">{row.xp.toLocaleString()} XP</p>
              <p className="text-[10px] text-[var(--muted)]">Lvl {row.level}</p>
            </div>
          ))}
        </div>
      )}

      {rest.length > 0 ? (
        <>
          <div className="mb-2 flex items-center justify-between px-0.5">
            <div className="flex items-center gap-2">
              <Trophy size={14} className="text-[#B8E86A]" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Top 100</p>
            </div>
            <Link href="/settings#leaderboard" className="text-[10px] font-semibold text-[#B8E86A] hover:underline">
              Name on board →
            </Link>
          </div>
          <div className="premium-card mb-4 max-h-[min(55vh,28rem)] overflow-y-auto rounded-2xl p-2">
            <ul className="divide-y divide-white/[0.06]">
              {rest.map((row) => (
                <li key={row.userId} className="flex items-center justify-between gap-2 px-2 py-2.5">
                  <span className="num w-8 shrink-0 text-center text-[11px] font-bold text-[var(--hint)]">{row.rank}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-[13px] font-semibold ${row.isYou ? "text-[#BEFF47]" : "text-[var(--white)]"}`}>
                      {row.displayName}
                      {row.isYou ? " (you)" : ""}
                    </p>
                    <p className="text-[10px] text-[var(--muted)]">Level {row.level}</p>
                  </div>
                  <span className="num shrink-0 text-[12px] font-bold text-[var(--white)]">{row.xp.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : top.length > 0 && top.length <= 3 ? (
        <p className="mb-4 text-center text-[12px] text-[var(--muted)]">Full ladder unlocks as more athletes join this season.</p>
      ) : null}

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--muted)]">
          <Sparkles size={13} className="text-[#BEFF47]" aria-hidden />
          Same XP formula as Arena — stay consistent; the ladder refreshes when you load Home, Game, or this page.
        </p>
      </div>
    </div>
  );
}
