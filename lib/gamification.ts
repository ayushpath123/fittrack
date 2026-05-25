/**
 * Authoritative gamification types and pure math helpers for FitTrack.
 * Server routes derive streaks from {@link DailyActivityLog} rows — never from client payloads.
 */
import type { PrismaClient } from "@prisma/client";

// ── types ─────────────────────────────────────────────────────────────────

/** Audit / API action identifiers (mirror Prisma `GamificationAction`). */
export type GamificationAction =
  | "CHEST_CLAIM"
  | "BOSS_CLAIM"
  | "BUY_FREEZE"
  | "BUY_XP_BOOST"
  | "ARM_FREEZE"
  | "USE_XP_BOOST"
  | "ACTIVITY_LOG"
  | "XP_AWARD"
  | "QUEST_XP"
  | "STREAK_SYNC";

export type StreakResult = {
  globalStreak: number;
  mealStreak: number;
  workoutStreak: number;
  hydrationStreak: number;
  bestGlobalStreak: number;
};

export type WeeklyBossState = {
  weekKey: string;
  progress: number;
  target: number;
  defeated: boolean;
  lootClaimed: boolean;
};

export type Quest = {
  id: string;
  label: string;
  rewardXp: number;
  /** Whether the underlying activity for today is satisfied. */
  completed: boolean;
};

export type LevelInfo = {
  level: number;
  rank: string;
  xpIntoLevel: number;
  xpForNextLevel: number;
  totalXp: number;
};

export type LeaderboardStandings = {
  seasonKey: string;
  globalRank: number;
  totalRanked: number;
  percentile: number;
};

/** Full payload returned by `GET /api/gamification/summary` and mutation routes. */
export type GamificationSummary = {
  globalStreak: number;
  bestGlobalStreak: number;
  mealStreak: number;
  workoutStreak: number;
  hydrationStreak: number;
  totalXp: number;
  /** Alias for UI that still expects `xp` for leaderboard-style displays. */
  xp: number;
  level: number;
  rank: string;
  xpIntoLevel: number;
  xpForNextLevel: number;
  coins: number;
  freezeInventory: number;
  xpBoostTokens: number;
  freezeArmed: boolean;
  /** Cosmetic “charges” derived from level (not spendable inventory). */
  streakFreezeCharges: number;
  dailyChestReady: boolean;
  bossReady: boolean;
  weeklyBossState: WeeklyBossState;
  weeklyGoalProgress: number;
  weeklyGoalTarget: number;
  badges: string[];
  quests: Quest[];
  dailyQuestsCompleted: number;
  leaderboard?: LeaderboardStandings | null;
};

export type DailyActivityLogInput = {
  date: Date;
  mealsLogged: boolean;
  workoutLogged: boolean;
  hydrationLogged: boolean;
};

// ── XP curve & ranks ───────────────────────────────────────────────────────

/** XP required to advance from level `L` to `L+1` (1-based `L`). */
export function xpSegmentForLevel(L: number): number {
  if (L < 1) return 0;
  return Math.max(1, Math.ceil(100 * L * Math.pow(1.15, L)));
}

/** Total XP threshold to **enter** `targetLevel` (level 1 starts at 0 XP). */
export function cumulativeXpToEnterLevel(targetLevel: number): number {
  if (targetLevel <= 1) return 0;
  let sum = 0;
  for (let L = 1; L < targetLevel; L++) sum += xpSegmentForLevel(L);
  return sum;
}

const ROMAN = ["I", "II", "III", "IV"] as const;

function subTierRoman(level: number, lo: number, hi: number): string {
  const span = hi - lo + 1;
  const idx = Math.min(3, Math.floor(((level - lo) / span) * 4));
  return ROMAN[idx] ?? "I";
}

/**
 * Maps a level to a display rank label (Bronze I–IV … Legendary).
 */
export function rankLabelForLevel(level: number): string {
  if (level >= 81) return "Legendary";
  if (level >= 56) return `Diamond ${subTierRoman(level, 56, 80)}`;
  if (level >= 36) return `Platinum ${subTierRoman(level, 36, 55)}`;
  if (level >= 21) return `Gold ${subTierRoman(level, 21, 35)}`;
  if (level >= 11) return `Silver ${subTierRoman(level, 11, 20)}`;
  return `Bronze ${subTierRoman(level, 1, 10)}`;
}

/**
 * Computes level, rank, and per-level XP progress from lifetime `totalXp`.
 */
export function computeLevelAndRank(totalXp: number): LevelInfo {
  const xp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  while (xp >= cumulativeXpToEnterLevel(level + 1)) {
    level += 1;
    if (level > 10_000) break;
  }
  const xpIntoLevel = xp - cumulativeXpToEnterLevel(level);
  const xpForNextLevel = xpSegmentForLevel(level);
  return {
    level,
    rank: rankLabelForLevel(level),
    xpIntoLevel,
    xpForNextLevel,
    totalXp: xp,
  };
}

// ── UTC date keys (align chest / boss with UTC) ───────────────────────────

export function utcDateKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseUtcDateKey(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

export function addUtcDaysKey(key: string, deltaDays: number): string {
  const t = parseUtcDateKey(key).getTime() + deltaDays * 86_400_000;
  return utcDateKey(new Date(t));
}

/** Monday-based day index Mon=0 … Sun=6 (UTC). */
function utcMondayIndex(d: Date): number {
  return (d.getUTCDay() + 6) % 7;
}

/** ISO week key `YYYY-Www` using ISO week-year (UTC). */
export function isoWeekKeyUtc(d: Date = new Date()): string {
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNr = utcMondayIndex(target);
  const thursday = new Date(target);
  thursday.setUTCDate(target.getUTCDate() - dayNr + 3);
  const isoYear = thursday.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  const firstMonday = new Date(firstThursday);
  firstMonday.setUTCDate(firstThursday.getUTCDate() - utcMondayIndex(firstThursday));
  const week = 1 + Math.round((target.getTime() - firstMonday.getTime()) / (7 * 86_400_000));
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

/** Monday 00:00 UTC of the ISO week containing `d`. */
export function isoWeekMondayUtc(d: Date): Date {
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const monday = new Date(target);
  monday.setUTCDate(target.getUTCDate() - utcMondayIndex(target));
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

export function utcDatesInIsoWeek(weekKey: string): string[] {
  const m = /^(\d{4})-W(\d{2})$/.exec(weekKey);
  if (!m) return [];
  const isoYear = Number(m[1]);
  const week = Number(m[2]);
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  const week1Monday = new Date(firstThursday);
  week1Monday.setUTCDate(firstThursday.getUTCDate() - utcMondayIndex(firstThursday));
  const monday = new Date(week1Monday);
  monday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  const keys: string[] = [];
  for (let i = 0; i < 7; i++) {
    const t = new Date(monday);
    t.setUTCDate(monday.getUTCDate() + i);
    keys.push(utcDateKey(t));
  }
  return keys;
}

// ── streaks (pure) ─────────────────────────────────────────────────────────

function activityFor(
  row: { mealsLogged: boolean; workoutLogged: boolean; hydrationLogged: boolean } | undefined,
  kind: "global" | "meal" | "workout" | "hydration",
): boolean {
  if (!row) return false;
  if (kind === "global") return row.mealsLogged || row.workoutLogged || row.hydrationLogged;
  if (kind === "meal") return row.mealsLogged;
  if (kind === "workout") return row.workoutLogged;
  return row.hydrationLogged;
}

/**
 * Builds a UTC date-key → row map from activity log rows (any order).
 */
export function dailyLogMap(rows: ReadonlyArray<DailyActivityLogInput>): Map<string, DailyActivityLogInput> {
  const map = new Map<string, DailyActivityLogInput>();
  for (const r of rows) {
    const key = utcDateKey(new Date(r.date));
    map.set(key, r);
  }
  return map;
}

/**
 * Current streak ending at UTC “today”, with one optional skip for an empty today.
 */
export function currentUtcStreakFromMap(
  map: Map<string, { mealsLogged: boolean; workoutLogged: boolean; hydrationLogged: boolean }>,
  kind: "global" | "meal" | "workout" | "hydration",
  today: Date = new Date(),
): number {
  const todayKey = utcDateKey(today);
  let streak = 0;
  let d = 0;
  let skippedEmptyToday = false;
  while (d < 365 * 10) {
    const key = addUtcDaysKey(todayKey, -d);
    const active = activityFor(map.get(key), kind);
    if (active) {
      streak += 1;
      d += 1;
      continue;
    }
    if (d === 0 && !active && !skippedEmptyToday) {
      skippedEmptyToday = true;
      d += 1;
      continue;
    }
    break;
  }
  return streak;
}

/**
 * Longest consecutive UTC-day run where `kind` activity is satisfied.
 */
export function bestUtcStreakFromMap(
  map: Map<string, { mealsLogged: boolean; workoutLogged: boolean; hydrationLogged: boolean }>,
  kind: "global" | "meal" | "workout" | "hydration",
): number {
  const keys = [...map.keys()].filter((k) => activityFor(map.get(k), kind)).sort();
  if (!keys.length) return 0;
  let best = 1;
  let run = 1;
  for (let i = 1; i < keys.length; i++) {
    const prevT = parseUtcDateKey(keys[i - 1]!).getTime();
    const currT = parseUtcDateKey(keys[i]!).getTime();
    const diff = Math.round((currT - prevT) / 86_400_000);
    if (diff === 1) {
      run += 1;
      best = Math.max(best, run);
    } else if (diff > 1) {
      run = 1;
    }
  }
  return best;
}

/**
 * Pure streak derivation from normalized daily activity rows.
 */
export function computeStreaksFromDailyLogs(
  logs: ReadonlyArray<DailyActivityLogInput>,
  today: Date = new Date(),
): StreakResult {
  const map = dailyLogMap(logs);
  return {
    globalStreak: currentUtcStreakFromMap(map, "global", today),
    mealStreak: currentUtcStreakFromMap(map, "meal", today),
    workoutStreak: currentUtcStreakFromMap(map, "workout", today),
    hydrationStreak: currentUtcStreakFromMap(map, "hydration", today),
    bestGlobalStreak: bestUtcStreakFromMap(map, "global"),
  };
}

/**
 * Loads all {@link DailyActivityLog} rows for a user and returns {@link computeStreaksFromDailyLogs}.
 */
export async function computeStreaks(userId: string, db: Pick<PrismaClient, "dailyActivityLog">): Promise<StreakResult> {
  const rows = await db.dailyActivityLog.findMany({
    where: { userId },
    orderBy: { date: "asc" },
  });
  return computeStreaksFromDailyLogs(rows, new Date());
}

// ── quests (server-shaped) ─────────────────────────────────────────────────

export const DAILY_QUEST_DEFS: readonly { id: string; label: string; rewardXp: number }[] = [
  { id: "log_meals", label: "Log all 3 meals", rewardXp: 50 },
  { id: "log_workout", label: "Complete a workout", rewardXp: 80 },
  { id: "log_hydration", label: "Hit hydration goal", rewardXp: 40 },
  { id: "full_day", label: "Complete all 3 goals", rewardXp: 60 },
];

export function buildServerDailyQuests(args: {
  mealsLogged: boolean;
  workoutLogged: boolean;
  hydrationLogged: boolean;
}): Quest[] {
  const { mealsLogged, workoutLogged, hydrationLogged } = args;
  const full = mealsLogged && workoutLogged && hydrationLogged;
  return DAILY_QUEST_DEFS.map((q) => {
    let completed = false;
    if (q.id === "log_meals") completed = mealsLogged;
    else if (q.id === "log_workout") completed = workoutLogged;
    else if (q.id === "log_hydration") completed = hydrationLogged;
    else if (q.id === "full_day") completed = full;
    return { ...q, completed };
  });
}

// ── misc XP tables (tweak here) ───────────────────────────────────────────

export const STREAK_XP_BONUS_EVERY_DAYS = 7;
export const STREAK_XP_BONUS_AMOUNT = 25;

export function badgesFromSnapshot(args: {
  globalStreak: number;
  bestGlobalStreak: number;
  mealStreak: number;
  workoutStreak: number;
  hydrationStreak: number;
  level: number;
  coins: number;
}): string[] {
  const badges: string[] = [];
  if (args.globalStreak >= 3) badges.push("3-day momentum");
  if (args.globalStreak >= 7) badges.push("Week warrior");
  if (args.bestGlobalStreak >= 14) badges.push("Unbreakable");
  if (args.mealStreak >= 5) badges.push("Meal consistency");
  if (args.workoutStreak >= 5) badges.push("Training rhythm");
  if (args.hydrationStreak >= 5) badges.push("Hydration hero");
  if (args.level >= 20) badges.push("Rank climber");
  if (args.coins >= 500) badges.push("Coin hoarder");
  return badges.slice(0, 6);
}
