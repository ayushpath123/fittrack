/**
 * Server orchestration for FitTrack gamification: Prisma access, summary assembly,
 * and transactional helpers used by App Router API routes.
 */
import type { GamificationAction, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { syncLeaderboardAndGetStandings } from "@/lib/leaderboard";
import {
  badgesFromSnapshot,
  buildServerDailyQuests,
  computeLevelAndRank,
  computeStreaksFromDailyLogs,
  dailyLogMap,
  DAILY_QUEST_DEFS,
  isoWeekKeyUtc,
  parseUtcDateKey,
  STREAK_XP_BONUS_AMOUNT,
  STREAK_XP_BONUS_EVERY_DAYS,
  type GamificationSummary,
  type Quest,
  utcDateKey,
  utcDatesInIsoWeek,
} from "@/lib/gamification";
import { countAuditActionsSince, runFraudChecks } from "@/lib/gamification-fraud";

/** Typed HTTP failure for route handlers (mapped to NextResponse). */
export class GamificationHttpError extends Error {
  readonly statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "GamificationHttpError";
    this.statusCode = statusCode;
  }
}

export type RequestAuditMeta = {
  ipAddress: string | null;
  userAgent: string | null;
};

/**
 * Extracts client IP and user agent for audit logging.
 */
export function getRequestAuditMeta(req: Request): RequestAuditMeta {
  const fwd = req.headers.get("x-forwarded-for");
  const ip =
    fwd?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    req.headers.get("cf-connecting-ip") ??
    null;
  return { ipAddress: ip, userAgent: req.headers.get("user-agent") };
}

function isSameUtcDate(a: Date | null | undefined, dayKey: string): boolean {
  return !!a && utcDateKey(a) === dayKey;
}

type Tx = Prisma.TransactionClient;

function parseQuestPayouts(raw: unknown): Record<string, Record<string, boolean>> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, Record<string, boolean>> = {};
  for (const [day, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!val || typeof val !== "object") continue;
    const inner: Record<string, boolean> = {};
    for (const [qid, done] of Object.entries(val as Record<string, unknown>)) {
      if (done === true) inner[qid] = true;
    }
    out[day] = inner;
  }
  return out;
}

/**
 * Ensures a {@link UserGamification} row exists for the user (idempotent upsert).
 */
export async function ensureUserGamification(tx: Tx, userId: string): Promise<void> {
  await tx.userGamification.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

/**
 * Reconciles {@link DailyActivityLog} for a UTC calendar day from authoritative meal,
 * workout, and hydration tables.
 */
export async function reconcileDailyActivityForUtcDate(
  tx: Tx,
  userId: string,
  dateKey: string,
): Promise<{ mealsLogged: boolean; workoutLogged: boolean; hydrationLogged: boolean }> {
  const dayStart = parseUtcDateKey(dateKey);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCHours(23, 59, 59, 999);

  const goals = await tx.goalSetting.findUnique({ where: { userId }, select: { waterTargetMl: true } });
  const waterTarget = goals?.waterTargetMl ?? 2000;

  const meals = await tx.mealEntry.findMany({
    where: { userId, date: { gte: dayStart, lte: dayEnd } },
    select: { mealType: true },
  });
  const main = new Set(["breakfast", "lunch", "dinner"]);
  const types = new Set(
    meals.map((m) => String(m.mealType).trim().toLowerCase()).filter((t) => main.has(t)),
  );
  const mealsLogged = types.size >= 3;

  const workoutN = await tx.workoutLog.count({
    where: { userId, workoutDate: { gte: dayStart, lte: dayEnd } },
  });
  const workoutLogged = workoutN > 0;

  const hydRows = await tx.hydrationLog.findMany({
    where: { userId, date: { gte: dayStart, lte: dayEnd } },
    select: { totalMl: true },
  });
  const totalMl = hydRows.reduce((s, r) => s + (r.totalMl ?? 0), 0);
  const hydrationLogged = totalMl >= waterTarget;

  await tx.dailyActivityLog.upsert({
    where: { userId_date: { userId, date: dayStart } },
    create: {
      userId,
      date: dayStart,
      mealsLogged,
      workoutLogged,
      hydrationLogged,
    },
    update: { mealsLogged, workoutLogged, hydrationLogged },
  });

  return { mealsLogged, workoutLogged, hydrationLogged };
}

/**
 * Recomputes ISO-week boss progress from {@link DailyActivityLog} and upserts {@link WeeklyBossLog}.
 */
export async function syncWeeklyBossProgress(tx: Tx, userId: string, weekKey: string): Promise<void> {
  const keys = utcDatesInIsoWeek(weekKey);
  if (!keys.length) return;
  const starts = keys.map((k) => parseUtcDateKey(k));
  const logs = await tx.dailyActivityLog.findMany({
    where: { userId, date: { in: starts } },
  });
  const map = dailyLogMap(logs);
  let progress = 0;
  for (const k of keys) {
    const row = map.get(k);
    if (row?.mealsLogged && row.workoutLogged && row.hydrationLogged) progress += 1;
  }
  const target = 5;
  const defeated = progress >= target;
  await tx.weeklyBossLog.upsert({
    where: { userId_weekKey: { userId, weekKey } },
    create: { userId, weekKey, progress, target, defeated, lootClaimed: false },
    update: { progress, target, defeated },
  });
}

/**
 * Recomputes streak columns from logs, persists drift correction, optionally writes `STREAK_SYNC` audit.
 */
export async function persistStreaksFromLogs(
  tx: Tx,
  userId: string,
  meta: RequestAuditMeta,
  options?: { writeAudit: boolean },
): Promise<ReturnType<typeof computeStreaksFromDailyLogs>> {
  const logs = await tx.dailyActivityLog.findMany({
    where: { userId },
    orderBy: { date: "asc" },
    take: 4000,
  });
  const s = computeStreaksFromDailyLogs(logs, new Date());
  const ug = await tx.userGamification.findUnique({ where: { userId } });
  if (!ug) return s;

  const drift =
    ug.globalStreak !== s.globalStreak ||
    ug.mealStreak !== s.mealStreak ||
    ug.workoutStreak !== s.workoutStreak ||
    ug.hydrationStreak !== s.hydrationStreak ||
    ug.bestGlobalStreak !== s.bestGlobalStreak;

  await tx.userGamification.update({
    where: { userId },
    data: {
      globalStreak: s.globalStreak,
      mealStreak: s.mealStreak,
      workoutStreak: s.workoutStreak,
      hydrationStreak: s.hydrationStreak,
      bestGlobalStreak: s.bestGlobalStreak,
    },
  });

  if (drift && options?.writeAudit) {
    await tx.gamificationAuditLog.create({
      data: {
        userId,
        action: "STREAK_SYNC",
        coinsDelta: 0,
        previousValue: {
          globalStreak: ug.globalStreak,
          mealStreak: ug.mealStreak,
          workoutStreak: ug.workoutStreak,
          hydrationStreak: ug.hydrationStreak,
          bestGlobalStreak: ug.bestGlobalStreak,
        },
        newValue: { ...s },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });
  }
  return s;
}

async function buildSummaryPayload(
  userId: string,
  ug: {
    coins: number;
    freezeInventory: number;
    xpBoostTokens: number;
    freezeArmed: boolean;
    totalXp: number;
    level: number;
    rank: string;
    lastChestClaimedAt: Date | null;
    lastBossClaimedWeek: string | null;
    questPayoutsByDay: unknown;
  },
  streaks: ReturnType<typeof computeStreaksFromDailyLogs>,
  weekRow: { weekKey: string; progress: number; target: number; defeated: boolean; lootClaimed: boolean } | null,
  todayQuests: Quest[],
  leaderboard: GamificationSummary["leaderboard"],
): Promise<GamificationSummary> {
  const { level, rank, xpIntoLevel, xpForNextLevel, totalXp } = computeLevelAndRank(ug.totalXp);
  const todayKey = utcDateKey(new Date());
  const weekKey = isoWeekKeyUtc(new Date());

  const dailyChestReady = !isSameUtcDate(ug.lastChestClaimedAt, todayKey);
  const bossReady =
    !!weekRow &&
    weekRow.defeated &&
    !weekRow.lootClaimed &&
    ug.lastBossClaimedWeek !== weekKey;

  const streakFreezeCharges = Math.max(0, Math.min(3, Math.floor(level / 5)));

  const badges = badgesFromSnapshot({
    globalStreak: streaks.globalStreak,
    bestGlobalStreak: streaks.bestGlobalStreak,
    mealStreak: streaks.mealStreak,
    workoutStreak: streaks.workoutStreak,
    hydrationStreak: streaks.hydrationStreak,
    level,
    coins: ug.coins,
  });

  const dailyQuestsCompleted = todayQuests.filter((q) => q.completed).length;

  return {
    globalStreak: streaks.globalStreak,
    bestGlobalStreak: streaks.bestGlobalStreak,
    mealStreak: streaks.mealStreak,
    workoutStreak: streaks.workoutStreak,
    hydrationStreak: streaks.hydrationStreak,
    totalXp,
    xp: totalXp,
    level,
    rank,
    xpIntoLevel,
    xpForNextLevel,
    coins: ug.coins,
    freezeInventory: ug.freezeInventory,
    xpBoostTokens: ug.xpBoostTokens,
    freezeArmed: ug.freezeArmed,
    streakFreezeCharges,
    dailyChestReady,
    bossReady,
    weeklyBossState: weekRow
      ? {
          weekKey: weekRow.weekKey,
          progress: weekRow.progress,
          target: weekRow.target,
          defeated: weekRow.defeated,
          lootClaimed: weekRow.lootClaimed,
        }
      : {
          weekKey,
          progress: 0,
          target: 5,
          defeated: false,
          lootClaimed: false,
        },
    weeklyGoalProgress: weekRow?.progress ?? 0,
    weeklyGoalTarget: weekRow?.target ?? 5,
    badges,
    quests: todayQuests,
    dailyQuestsCompleted,
    leaderboard,
  };
}

/**
 * Builds the full {@link GamificationSummary} for API responses (read path + after mutations).
 */
export async function fetchGamificationSummaryForUser(
  userId: string,
  opts?: { leaderboard?: boolean; auditStreakSync?: boolean; reqMeta?: RequestAuditMeta },
): Promise<GamificationSummary> {
  const meta = opts?.reqMeta ?? { ipAddress: null, userAgent: null };
  const leaderboardEnabled = opts?.leaderboard !== false;

  const { summary, totalXp } = await prisma.$transaction(async (tx) => {
    await ensureUserGamification(tx, userId);
    const ugLock = await tx.userGamification.findUniqueOrThrow({ where: { userId } });
    if (ugLock.lockedAt) {
      throw new GamificationHttpError(403, "Forbidden");
    }
    const todayKey = utcDateKey(new Date());
    await reconcileDailyActivityForUtcDate(tx, userId, todayKey);

    const weekKey = isoWeekKeyUtc(new Date());
    await syncWeeklyBossProgress(tx, userId, weekKey);

    const prevGlobalStreak = ugLock.globalStreak;
    const streaks = await persistStreaksFromLogs(tx, userId, meta, {
      writeAudit: !!opts?.auditStreakSync,
    });

    const crossedStreakMilestone =
      streaks.globalStreak > 0 &&
      streaks.globalStreak % STREAK_XP_BONUS_EVERY_DAYS === 0 &&
      Math.floor(streaks.globalStreak / STREAK_XP_BONUS_EVERY_DAYS) >
        Math.floor(prevGlobalStreak / STREAK_XP_BONUS_EVERY_DAYS);
    if (crossedStreakMilestone) {
      await awardXp(
        tx,
        userId,
        STREAK_XP_BONUS_AMOUNT,
        `streak_milestone_${streaks.globalStreak}`,
        meta,
      );
    }

    const dayRow = await tx.dailyActivityLog.findUnique({
      where: { userId_date: { userId, date: parseUtcDateKey(todayKey) } },
    });
    const quests = buildServerDailyQuests({
      mealsLogged: !!dayRow?.mealsLogged,
      workoutLogged: !!dayRow?.workoutLogged,
      hydrationLogged: !!dayRow?.hydrationLogged,
    });
    await grantQuestXpIfNeeded(tx, userId, todayKey, quests, meta);

    const ug = await tx.userGamification.findUniqueOrThrow({ where: { userId } });
    const lvl = computeLevelAndRank(ug.totalXp);
    if (ug.level !== lvl.level || ug.rank !== lvl.rank) {
      await tx.userGamification.update({
        where: { userId },
        data: { level: lvl.level, rank: lvl.rank },
      });
    }

    const weekRow = await tx.weeklyBossLog.findUnique({
      where: { userId_weekKey: { userId, weekKey } },
    });

    const refreshed = await tx.userGamification.findUniqueOrThrow({ where: { userId } });

    const summaryInner = await buildSummaryPayload(userId, refreshed, streaks, weekRow, quests, null);
    return { summary: summaryInner, totalXp: refreshed.totalXp };
  });

  let leaderboard: GamificationSummary["leaderboard"] = null;
  if (leaderboardEnabled) {
    leaderboard = await syncLeaderboardAndGetStandings(prisma, userId, totalXp);
  }
  return { ...summary, leaderboard };
}

/**
 * Adds XP, recomputes level/rank, and appends an `XP_AWARD` audit row.
 */
export async function awardXp(
  tx: Tx,
  userId: string,
  amount: number,
  reason: string,
  meta: RequestAuditMeta,
): Promise<{ leveledUp: boolean; beforeLevel: number; afterLevel: number; totalXp: number }> {
  const ug = await tx.userGamification.findUniqueOrThrow({ where: { userId } });
  const beforeLevel = ug.level;
  const totalXp = ug.totalXp + amount;
  const { level, rank } = computeLevelAndRank(totalXp);
  await tx.userGamification.update({
    where: { userId },
    data: { totalXp, level, rank },
  });
  await tx.gamificationAuditLog.create({
    data: {
      userId,
      action: "XP_AWARD",
      coinsDelta: 0,
      previousValue: { totalXp: ug.totalXp, level: beforeLevel },
      newValue: { totalXp, level },
      metadata: { reason },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    },
  });
  return { leveledUp: level > beforeLevel, beforeLevel, afterLevel: level, totalXp };
}

async function grantQuestXpIfNeeded(
  tx: Tx,
  userId: string,
  dayKey: string,
  quests: Quest[],
  meta: RequestAuditMeta,
): Promise<void> {
  const ug = await tx.userGamification.findUniqueOrThrow({ where: { userId } });
  const base = parseQuestPayouts(ug.questPayoutsByDay);
  const next: Record<string, Record<string, boolean>> = { ...base, [dayKey]: { ...(base[dayKey] ?? {}) } };
  const dayPaid = next[dayKey]!;

  for (const q of quests) {
    if (!q.completed) continue;
    if (dayPaid[q.id]) continue;
    const def = DAILY_QUEST_DEFS.find((d) => d.id === q.id);
    if (!def) continue;
    await awardXp(tx, userId, def.rewardXp, `quest:${def.id}`, meta);
    dayPaid[q.id] = true;
  }

  await tx.userGamification.update({
    where: { userId },
    data: { questPayoutsByDay: next as Prisma.InputJsonValue },
  });
}

/**
 * Applies activity logging: upserts the day row, recomputes streaks, boss progress, quest XP, streak milestone XP.
 */
export async function applyActivityLogMutation(args: {
  userId: string;
  dateKey: string;
  type: "meal" | "workout" | "hydration";
  meta: RequestAuditMeta;
}): Promise<GamificationSummary> {
  const { userId, dateKey, type, meta } = args;

  await prisma.$transaction(async (tx) => {
    await ensureUserGamification(tx, userId);
    const ug0 = await tx.userGamification.findUnique({ where: { userId } });
    if (ug0?.lockedAt) throw new GamificationHttpError(403, "Forbidden");
    const prevGlobalStreak = ug0?.globalStreak ?? 0;

    await reconcileDailyActivityForUtcDate(tx, userId, dateKey);

    const weekKey = isoWeekKeyUtc(parseUtcDateKey(dateKey));
    await syncWeeklyBossProgress(tx, userId, weekKey);

    const streaks = await persistStreaksFromLogs(tx, userId, meta, { writeAudit: false });

    const crossedStreakMilestone =
      streaks.globalStreak > 0 &&
      streaks.globalStreak % STREAK_XP_BONUS_EVERY_DAYS === 0 &&
      Math.floor(streaks.globalStreak / STREAK_XP_BONUS_EVERY_DAYS) >
        Math.floor(prevGlobalStreak / STREAK_XP_BONUS_EVERY_DAYS);
    if (crossedStreakMilestone) {
      await awardXp(
        tx,
        userId,
        STREAK_XP_BONUS_AMOUNT,
        `streak_milestone_${streaks.globalStreak}`,
        meta,
      );
    }

    const dayRow = await tx.dailyActivityLog.findUnique({
      where: { userId_date: { userId, date: parseUtcDateKey(dateKey) } },
    });
    const quests = buildServerDailyQuests({
      mealsLogged: !!dayRow?.mealsLogged,
      workoutLogged: !!dayRow?.workoutLogged,
      hydrationLogged: !!dayRow?.hydrationLogged,
    });
    await grantQuestXpIfNeeded(tx, userId, dateKey, quests, meta);

    const ug1 = await tx.userGamification.findUniqueOrThrow({ where: { userId } });
    const fraud = await runFraudChecks(
      tx,
      {
        userId,
        action: "ACTIVITY_LOG",
        coinsDelta: 0,
        userRow: {
          coins: ug1.coins,
          freezeInventory: ug1.freezeInventory,
          globalStreak: ug1.globalStreak,
        },
        derivedStreaks: streaks,
      },
      new Date(Date.now() - 24 * 60 * 60 * 1000),
    );

    await tx.gamificationAuditLog.create({
      data: {
        userId,
        action: "ACTIVITY_LOG",
        coinsDelta: 0,
        previousValue: { type, dateKey },
        newValue: {
          mealsLogged: dayRow?.mealsLogged,
          workoutLogged: dayRow?.workoutLogged,
          hydrationLogged: dayRow?.hydrationLogged,
        },
        flagged: fraud.flagged,
        flagReason: fraud.flagReason,
        metadata: { type, dateKey },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });

    if (fraud.shouldLock) {
      await tx.userGamification.update({
        where: { userId },
        data: { lockedAt: new Date() },
      });
    }
  });

  return fetchGamificationSummaryForUser(userId, { reqMeta: meta });
}

/**
 * Records an audit row with optional fraud flags (mutation helper).
 */
export async function insertAudit(
  tx: Tx,
  data: {
    userId: string;
    action: GamificationAction;
    coinsDelta: number;
    previousValue?: unknown;
    newValue?: unknown;
    metadata?: unknown;
    flagged?: boolean;
    flagReason?: string | null;
    meta: RequestAuditMeta;
  },
): Promise<void> {
  await tx.gamificationAuditLog.create({
    data: {
      userId: data.userId,
      action: data.action,
      coinsDelta: data.coinsDelta,
      previousValue: data.previousValue === undefined ? undefined : (data.previousValue as Prisma.InputJsonValue),
      newValue: data.newValue === undefined ? undefined : (data.newValue as Prisma.InputJsonValue),
      metadata: data.metadata === undefined ? undefined : (data.metadata as Prisma.InputJsonValue),
      flagged: data.flagged ?? false,
      flagReason: data.flagReason ?? null,
      ipAddress: data.meta.ipAddress,
      userAgent: data.meta.userAgent,
    },
  });
}

function startOfUtcDay(d: Date): Date {
  return parseUtcDateKey(utcDateKey(d));
}

/**
 * Claims the daily chest (+40 coins, UTC day idempotent).
 */
export async function claimDailyChestMutation(
  userId: string,
  meta: RequestAuditMeta,
): Promise<GamificationSummary> {
  const rolling24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const todayKey = utcDateKey(new Date());

  await prisma.$transaction(async (tx) => {
    await ensureUserGamification(tx, userId);
    const ug = await tx.userGamification.findUniqueOrThrow({ where: { userId } });
    if (ug.lockedAt) throw new GamificationHttpError(403, "Forbidden");

    if (isSameUtcDate(ug.lastChestClaimedAt, todayKey)) {
      throw new GamificationHttpError(409, "Chest already claimed today");
    }

    const chest24h = await countAuditActionsSince(tx, userId, "CHEST_CLAIM", rolling24h);
    if (chest24h >= 2) {
      throw new GamificationHttpError(429, "Too many chest claims");
    }

    const prevCoins = ug.coins;
    const newCoins = prevCoins + 40;
    await tx.userGamification.update({
      where: { userId },
      data: { coins: newCoins, lastChestClaimedAt: new Date() },
    });

    const streaks = await persistStreaksFromLogs(tx, userId, meta, { writeAudit: false });
    const ug2 = await tx.userGamification.findUniqueOrThrow({ where: { userId } });
    const fraud = await runFraudChecks(
      tx,
      {
        userId,
        action: "CHEST_CLAIM",
        coinsDelta: 40,
        userRow: {
          coins: ug2.coins,
          freezeInventory: ug2.freezeInventory,
          globalStreak: ug2.globalStreak,
        },
        derivedStreaks: streaks,
      },
      rolling24h,
    );

    await insertAudit(tx, {
      userId,
      action: "CHEST_CLAIM",
      coinsDelta: 40,
      previousValue: { coins: prevCoins },
      newValue: { coins: newCoins },
      flagged: fraud.flagged,
      flagReason: fraud.flagReason,
      meta,
    });

    if (fraud.shouldLock) {
      await tx.userGamification.update({ where: { userId }, data: { lockedAt: new Date() } });
    }
  });

  return fetchGamificationSummaryForUser(userId, { reqMeta: meta });
}

/**
 * Claims weekly boss loot (+140 coins, +1 freeze) once per ISO week.
 */
export async function claimWeeklyBossMutation(
  userId: string,
  meta: RequestAuditMeta,
): Promise<GamificationSummary> {
  const weekKey = isoWeekKeyUtc(new Date());
  const rolling24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    await ensureUserGamification(tx, userId);
    const ug = await tx.userGamification.findUniqueOrThrow({ where: { userId } });
    if (ug.lockedAt) throw new GamificationHttpError(403, "Forbidden");

    if (ug.lastBossClaimedWeek === weekKey) {
      throw new GamificationHttpError(409, "Boss loot already claimed this week");
    }

    const row = await tx.weeklyBossLog.findUnique({
      where: { userId_weekKey: { userId, weekKey } },
    });
    if (!row || !row.defeated || row.progress < row.target) {
      throw new GamificationHttpError(403, "Boss not defeated");
    }
    if (row.lootClaimed) {
      throw new GamificationHttpError(409, "Loot already claimed");
    }

    const prevCoins = ug.coins;
    const prevFreeze = ug.freezeInventory;
    const newCoins = prevCoins + 140;
    const newFreeze = prevFreeze + 1;

    await tx.userGamification.update({
      where: { userId },
      data: {
        coins: newCoins,
        freezeInventory: newFreeze,
        lastBossClaimedWeek: weekKey,
      },
    });
    await tx.weeklyBossLog.update({
      where: { userId_weekKey: { userId, weekKey } },
      data: { lootClaimed: true },
    });

    const streaks = await persistStreaksFromLogs(tx, userId, meta, { writeAudit: false });
    const ug2 = await tx.userGamification.findUniqueOrThrow({ where: { userId } });
    const fraud = await runFraudChecks(
      tx,
      {
        userId,
        action: "BOSS_CLAIM",
        coinsDelta: 140,
        userRow: {
          coins: ug2.coins,
          freezeInventory: ug2.freezeInventory,
          globalStreak: ug2.globalStreak,
        },
        derivedStreaks: streaks,
      },
      rolling24h,
    );

    await insertAudit(tx, {
      userId,
      action: "BOSS_CLAIM",
      coinsDelta: 140,
      previousValue: { coins: prevCoins, freezeInventory: prevFreeze },
      newValue: { coins: newCoins, freezeInventory: newFreeze },
      metadata: { weekKey },
      flagged: fraud.flagged,
      flagReason: fraud.flagReason,
      meta,
    });

    if (fraud.shouldLock) {
      await tx.userGamification.update({ where: { userId }, data: { lockedAt: new Date() } });
    }
  });

  return fetchGamificationSummaryForUser(userId, { reqMeta: meta });
}

/**
 * Purchases a streak freeze token for 120 coins.
 */
export async function buyFreezeMutation(userId: string, meta: RequestAuditMeta): Promise<GamificationSummary> {
  const rolling24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const dayStart = startOfUtcDay(new Date());

  await prisma.$transaction(async (tx) => {
    await ensureUserGamification(tx, userId);
    const ug = await tx.userGamification.findUniqueOrThrow({ where: { userId } });
    if (ug.lockedAt) throw new GamificationHttpError(403, "Forbidden");
    if (ug.coins < 120) throw new GamificationHttpError(400, "Insufficient coins");

    const buysToday = await tx.gamificationAuditLog.count({
      where: { userId, action: "BUY_FREEZE", createdAt: { gte: dayStart } },
    });
    const anomalyBuy = buysToday >= 5;

    const prevCoins = ug.coins;
    const prevInv = ug.freezeInventory;
    await tx.userGamification.update({
      where: { userId },
      data: { coins: prevCoins - 120, freezeInventory: prevInv + 1 },
    });

    const streaks = await persistStreaksFromLogs(tx, userId, meta, { writeAudit: false });
    const ug2 = await tx.userGamification.findUniqueOrThrow({ where: { userId } });
    const fraud = await runFraudChecks(
      tx,
      {
        userId,
        action: "BUY_FREEZE",
        coinsDelta: -120,
        userRow: {
          coins: ug2.coins,
          freezeInventory: ug2.freezeInventory,
          globalStreak: ug2.globalStreak,
        },
        derivedStreaks: streaks,
      },
      rolling24h,
    );

    await insertAudit(tx, {
      userId,
      action: "BUY_FREEZE",
      coinsDelta: -120,
      previousValue: { coins: prevCoins, freezeInventory: prevInv },
      newValue: { coins: ug2.coins, freezeInventory: ug2.freezeInventory },
      flagged: fraud.flagged || anomalyBuy,
      flagReason: anomalyBuy ? "buy_freeze_daily_volume" : fraud.flagReason,
      meta,
    });

    if (fraud.shouldLock) {
      await tx.userGamification.update({ where: { userId }, data: { lockedAt: new Date() } });
    }
  });

  return fetchGamificationSummaryForUser(userId, { reqMeta: meta });
}

/**
 * Purchases an XP boost token for 90 coins.
 */
export async function buyXpBoostMutation(userId: string, meta: RequestAuditMeta): Promise<GamificationSummary> {
  const rolling24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    await ensureUserGamification(tx, userId);
    const ug = await tx.userGamification.findUniqueOrThrow({ where: { userId } });
    if (ug.lockedAt) throw new GamificationHttpError(403, "Forbidden");
    if (ug.coins < 90) throw new GamificationHttpError(400, "Insufficient coins");

    const prevCoins = ug.coins;
    const prevTok = ug.xpBoostTokens;
    await tx.userGamification.update({
      where: { userId },
      data: { coins: prevCoins - 90, xpBoostTokens: prevTok + 1 },
    });

    const streaks = await persistStreaksFromLogs(tx, userId, meta, { writeAudit: false });
    const ug2 = await tx.userGamification.findUniqueOrThrow({ where: { userId } });
    const fraud = await runFraudChecks(
      tx,
      {
        userId,
        action: "BUY_XP_BOOST",
        coinsDelta: -90,
        userRow: {
          coins: ug2.coins,
          freezeInventory: ug2.freezeInventory,
          globalStreak: ug2.globalStreak,
        },
        derivedStreaks: streaks,
      },
      rolling24h,
    );

    await insertAudit(tx, {
      userId,
      action: "BUY_XP_BOOST",
      coinsDelta: -90,
      previousValue: { coins: prevCoins, xpBoostTokens: prevTok },
      newValue: { coins: ug2.coins, xpBoostTokens: ug2.xpBoostTokens },
      flagged: fraud.flagged,
      flagReason: fraud.flagReason,
      meta,
    });

    if (fraud.shouldLock) {
      await tx.userGamification.update({ where: { userId }, data: { lockedAt: new Date() } });
    }
  });

  return fetchGamificationSummaryForUser(userId, { reqMeta: meta });
}

/**
 * Arms a streak freeze (consumes one inventory token).
 */
export async function armFreezeMutation(userId: string, meta: RequestAuditMeta): Promise<GamificationSummary> {
  const rolling24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    await ensureUserGamification(tx, userId);
    const ug = await tx.userGamification.findUniqueOrThrow({ where: { userId } });
    if (ug.lockedAt) throw new GamificationHttpError(403, "Forbidden");
    if (ug.freezeInventory < 1) throw new GamificationHttpError(400, "No freeze tokens");
    if (ug.freezeArmed) throw new GamificationHttpError(400, "Freeze already armed");

    const prevInv = ug.freezeInventory;
    await tx.userGamification.update({
      where: { userId },
      data: { freezeInventory: prevInv - 1, freezeArmed: true },
    });

    const streaks = await persistStreaksFromLogs(tx, userId, meta, { writeAudit: false });
    const ug2 = await tx.userGamification.findUniqueOrThrow({ where: { userId } });
    const fraud = await runFraudChecks(
      tx,
      {
        userId,
        action: "ARM_FREEZE",
        coinsDelta: 0,
        userRow: {
          coins: ug2.coins,
          freezeInventory: ug2.freezeInventory,
          globalStreak: ug2.globalStreak,
        },
        derivedStreaks: streaks,
      },
      rolling24h,
    );

    await insertAudit(tx, {
      userId,
      action: "ARM_FREEZE",
      coinsDelta: 0,
      previousValue: { freezeInventory: prevInv, freezeArmed: false },
      newValue: { freezeInventory: ug2.freezeInventory, freezeArmed: true },
      flagged: fraud.flagged,
      flagReason: fraud.flagReason,
      meta,
    });

    if (fraud.shouldLock) {
      await tx.userGamification.update({ where: { userId }, data: { lockedAt: new Date() } });
    }
  });

  return fetchGamificationSummaryForUser(userId, { reqMeta: meta });
}

/**
 * Spends one XP boost token for +30 coins.
 */
export async function useXpBoostMutation(userId: string, meta: RequestAuditMeta): Promise<GamificationSummary> {
  const rolling24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    await ensureUserGamification(tx, userId);
    const ug = await tx.userGamification.findUniqueOrThrow({ where: { userId } });
    if (ug.lockedAt) throw new GamificationHttpError(403, "Forbidden");
    if (ug.xpBoostTokens < 1) throw new GamificationHttpError(400, "No XP boost tokens");

    const prevTok = ug.xpBoostTokens;
    const prevCoins = ug.coins;
    await tx.userGamification.update({
      where: { userId },
      data: { xpBoostTokens: prevTok - 1, coins: prevCoins + 30 },
    });

    const streaks = await persistStreaksFromLogs(tx, userId, meta, { writeAudit: false });
    const ug2 = await tx.userGamification.findUniqueOrThrow({ where: { userId } });
    const fraud = await runFraudChecks(
      tx,
      {
        userId,
        action: "USE_XP_BOOST",
        coinsDelta: 30,
        userRow: {
          coins: ug2.coins,
          freezeInventory: ug2.freezeInventory,
          globalStreak: ug2.globalStreak,
        },
        derivedStreaks: streaks,
      },
      rolling24h,
    );

    await insertAudit(tx, {
      userId,
      action: "USE_XP_BOOST",
      coinsDelta: 30,
      previousValue: { xpBoostTokens: prevTok, coins: prevCoins },
      newValue: { xpBoostTokens: ug2.xpBoostTokens, coins: ug2.coins },
      flagged: fraud.flagged,
      flagReason: fraud.flagReason,
      meta,
    });

    if (fraud.shouldLock) {
      await tx.userGamification.update({ where: { userId }, data: { lockedAt: new Date() } });
    }
  });

  return fetchGamificationSummaryForUser(userId, { reqMeta: meta });
}
