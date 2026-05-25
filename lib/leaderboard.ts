import type { PrismaClient } from "@prisma/client";
import type { LeaderboardStandings } from "@/lib/gamification";
import { computeLevelAndRank } from "@/lib/gamification";

/** Monthly season key (UTC) so ladders reset and stay approachable. */
export function getCurrentSeasonKey(d = new Date()): string {
  return d.toISOString().slice(0, 7);
}

const ALIAS_MAX = 24;

export function sanitizeLeaderboardAlias(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = raw.trim().slice(0, ALIAS_MAX);
  if (!t.length) return null;
  const safe = t.replace(/[^a-zA-Z0-9 _.\-]/g, "").trim();
  return safe.length ? safe.slice(0, ALIAS_MAX) : null;
}

export function leaderboardDisplayName(args: {
  userId: string;
  leaderboardPublic: boolean;
  leaderboardAlias: string | null;
}): string {
  const alias = sanitizeLeaderboardAlias(args.leaderboardAlias);
  if (args.leaderboardPublic && alias) return alias;
  const tail = args.userId.replace(/[^a-z0-9]/gi, "").slice(-4).toUpperCase();
  return `Rival ${tail || "????"}`;
}

export async function syncLeaderboardAndGetStandings(
  prisma: PrismaClient,
  userId: string,
  xp: number,
): Promise<LeaderboardStandings | null> {
  const seasonKey = getCurrentSeasonKey();
  const score = Math.max(0, Math.floor(xp));

  try {
    await prisma.leaderboardEntry.upsert({
      where: { userId_seasonKey: { userId, seasonKey } },
      create: { userId, seasonKey, xp: score },
      update: { xp: score },
    });

    const ahead = await prisma.leaderboardEntry.count({
      where: {
        seasonKey,
        OR: [{ xp: { gt: score } }, { AND: [{ xp: score }, { userId: { lt: userId } }] }],
      },
    });

    const globalRank = ahead + 1;
    const totalRanked = await prisma.leaderboardEntry.count({ where: { seasonKey } });

    let percentile = 50;
    if (totalRanked > 1) {
      percentile = Math.max(1, Math.min(99, Math.round((100 * (totalRanked - globalRank)) / (totalRanked - 1))));
    } else if (totalRanked === 1) {
      percentile = 100;
    }

    return { seasonKey, globalRank, totalRanked, percentile };
  } catch {
    return null;
  }
}

export type LeaderboardRowView = {
  rank: number;
  userId: string;
  xp: number;
  level: number;
  displayName: string;
  isYou: boolean;
};

export async function fetchLeaderboardTop(
  prisma: PrismaClient,
  seasonKey: string,
  opts: { take: number; skip?: number; viewerUserId?: string },
): Promise<LeaderboardRowView[]> {
  const skip = opts.skip ?? 0;
  const rows = await prisma.leaderboardEntry.findMany({
    where: { seasonKey },
    orderBy: [{ xp: "desc" }, { userId: "asc" }],
    take: opts.take,
    skip,
    include: {
      user: { select: { id: true, leaderboardAlias: true, leaderboardPublic: true } },
    },
  });

  return rows.map((row, i) => ({
    rank: skip + i + 1,
    userId: row.userId,
    xp: row.xp,
    level: computeLevelAndRank(row.xp).level,
    displayName: leaderboardDisplayName({
      userId: row.user.id,
      leaderboardPublic: row.user.leaderboardPublic,
      leaderboardAlias: row.user.leaderboardAlias,
    }),
    isYou: !!opts.viewerUserId && row.userId === opts.viewerUserId,
  }));
}
