/**
 * Server-side anomaly detection for gamification mutations.
 * Flag results are persisted on audit rows and optionally lock the profile — never returned to clients.
 */
import type { GamificationAction, Prisma, PrismaClient } from "@prisma/client";
import type { StreakResult } from "@/lib/gamification";

export type FraudEvaluationInput = {
  userId: string;
  action: GamificationAction;
  coinsDelta: number;
  /** Row after proposed DB writes (same transaction). */
  userRow: {
    coins: number;
    freezeInventory: number;
    globalStreak: number;
  };
  derivedStreaks: StreakResult;
};

const COIN_GAIN_24H_THRESHOLD = 500;
const FREEZE_TOLERANCE = 2;

/**
 * Sums **positive** coin deltas since `since` (for rolling 24h gain).
 */
export async function sumPositiveCoinDeltaSince(
  db: PrismaClient | Prisma.TransactionClient,
  userId: string,
  since: Date,
): Promise<number> {
  const agg = await db.gamificationAuditLog.aggregate({
    where: { userId, createdAt: { gte: since }, coinsDelta: { gt: 0 } },
    _sum: { coinsDelta: true },
  });
  return agg._sum.coinsDelta ?? 0;
}

export async function countAuditActionsSince(
  db: PrismaClient | Prisma.TransactionClient,
  userId: string,
  action: GamificationAction,
  since: Date,
): Promise<number> {
  return db.gamificationAuditLog.count({
    where: { userId, action, createdAt: { gte: since } },
  });
}

export async function countLifetimeAudit(
  db: PrismaClient | Prisma.TransactionClient,
  userId: string,
  action: GamificationAction,
): Promise<number> {
  return db.gamificationAuditLog.count({ where: { userId, action } });
}

/**
 * Computes fraud flags for the current mutation. Intended to run **inside** the same
 * Prisma transaction after state changes so balances reflect the latest writes.
 *
 * @returns `flagged`, human-readable `flagReason` for internal review, and `shouldLock`
 *          when the account should be frozen for manual investigation.
 */
export async function runFraudChecks(
  db: PrismaClient | Prisma.TransactionClient,
  input: FraudEvaluationInput,
  rolling24hSince: Date,
): Promise<{ flagged: boolean; flagReason: string | null; shouldLock: boolean }> {
  const reasons: string[] = [];

  const positive24h = await sumPositiveCoinDeltaSince(db, input.userId, rolling24hSince);
  const projectedCoinGain24h = positive24h + Math.max(0, input.coinsDelta);
  if (projectedCoinGain24h > COIN_GAIN_24H_THRESHOLD) {
    reasons.push(`coin_gain_24h>${COIN_GAIN_24H_THRESHOLD}`);
  }

  if (input.action === "CHEST_CLAIM") {
    const chest24h = await countAuditActionsSince(db, input.userId, "CHEST_CLAIM", rolling24hSince);
    if (chest24h >= 2) reasons.push("chest_claim_rate_24h");
  }

  const buyFreezes = await countLifetimeAudit(db, input.userId, "BUY_FREEZE");
  const bossLoots = await countLifetimeAudit(db, input.userId, "BOSS_CLAIM");
  const arms = await countLifetimeAudit(db, input.userId, "ARM_FREEZE");
  const maxExpectedFreezes = bossLoots + buyFreezes - arms + FREEZE_TOLERANCE;
  if (input.userRow.freezeInventory > maxExpectedFreezes) {
    reasons.push("freeze_inventory_over_supply");
  }

  if (input.userRow.globalStreak - input.derivedStreaks.globalStreak >= 2) {
    reasons.push("streak_inflated_vs_activity_logs");
  }

  const flagged = reasons.length > 0;
  return {
    flagged,
    flagReason: flagged ? reasons.join(";") : null,
    shouldLock:
      flagged &&
      reasons.some(
        (r) => r.startsWith("coin_gain") || r.startsWith("freeze_inventory") || r.startsWith("streak_inflated"),
      ),
  };
}
