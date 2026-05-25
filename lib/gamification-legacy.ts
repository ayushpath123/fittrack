/**
 * Legacy client-side / SSR gamification snapshot derived from meal, workout,
 * weight, and hydration tables (not the authoritative UserGamification row).
 * Used by dashboard and activity pages until those views read server XP.
 */
import { getDaysAgo, toLocalDateKey } from "@/lib/date";

export type LegacyQuestKey = "meal_today" | "workout_today" | "weight_today" | "hydration_goal_today";

export type LegacyDailyQuest = {
  id: LegacyQuestKey;
  label: string;
  rewardXp: number;
  completed: boolean;
};

export type LegacyGamificationSummary = {
  globalStreak: number;
  bestGlobalStreak: number;
  mealStreak: number;
  workoutStreak: number;
  weightStreak: number;
  hydrationStreak: number;
  xp: number;
  level: number;
  rank: string;
  xpIntoLevel: number;
  xpForNextLevel: number;
  badges: string[];
  streakFreezeCharges: number;
  quests: LegacyDailyQuest[];
  dailyQuestsCompleted: number;
  weeklyGoalProgress: number;
  weeklyGoalTarget: number;
};

export function legacyConsecutiveStreak(dayKeys: Set<string>) {
  let streak = 0;
  for (let i = 0; ; i++) {
    const key = toLocalDateKey(getDaysAgo(i));
    if (!dayKeys.has(key)) break;
    streak += 1;
  }
  return streak;
}

function legacyLongestStreak(dayKeys: Set<string>) {
  if (!dayKeys.size) return 0;
  const sorted = [...dayKeys.values()].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(`${sorted[i - 1]}T00:00:00`);
    const curr = new Date(`${sorted[i]}T00:00:00`);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86_400_000);
    if (diffDays === 1) {
      run += 1;
      best = Math.max(best, run);
    } else if (diffDays > 1) {
      run = 1;
    }
  }
  return best;
}

/** @deprecated Prefer {@link computeLevelAndRank} from `@/lib/gamification` for server XP. */
export function legacyGetXpLevelProgress(xp: number) {
  const level = Math.max(1, Math.floor(Math.sqrt(xp / 100)) + 1);
  const baseForLevel = Math.pow(level - 1, 2) * 100;
  const baseForNext = Math.pow(level, 2) * 100;
  return {
    level,
    xpIntoLevel: xp - baseForLevel,
    xpForNextLevel: baseForNext - baseForLevel,
  };
}

function legacyRankFromLevel(level: number) {
  if (level >= 18) return "Legend";
  if (level >= 14) return "Diamond";
  if (level >= 10) return "Platinum";
  if (level >= 7) return "Gold";
  if (level >= 4) return "Silver";
  return "Bronze";
}

export function buildLegacyGamificationSummary(args: {
  mealDays: Set<string>;
  workoutDays: Set<string>;
  weightDays: Set<string>;
  hydrationDays: Set<string>;
  adherence: number;
  hydrationGoalHitToday: boolean;
}): LegacyGamificationSummary {
  const { mealDays, workoutDays, weightDays, hydrationDays, adherence, hydrationGoalHitToday } = args;
  const globalDays = new Set<string>([
    ...mealDays.values(),
    ...workoutDays.values(),
    ...weightDays.values(),
    ...hydrationDays.values(),
  ]);
  const globalStreak = legacyConsecutiveStreak(globalDays);
  const bestGlobalStreak = legacyLongestStreak(globalDays);
  const mealStreak = legacyConsecutiveStreak(mealDays);
  const workoutStreak = legacyConsecutiveStreak(workoutDays);
  const weightStreak = legacyConsecutiveStreak(weightDays);
  const hydrationStreak = legacyConsecutiveStreak(hydrationDays);
  const todayKey = toLocalDateKey(new Date());

  const baseXp =
    mealDays.size * 8 +
    workoutDays.size * 15 +
    weightDays.size * 10 +
    hydrationDays.size * 6 +
    Math.round(Math.max(0, adherence - 50) * 2);
  const quests: LegacyDailyQuest[] = [
    { id: "meal_today", label: "Log a meal today", rewardXp: 20, completed: mealDays.has(todayKey) },
    { id: "workout_today", label: "Complete a workout today", rewardXp: 35, completed: workoutDays.has(todayKey) },
    { id: "weight_today", label: "Log weight today", rewardXp: 25, completed: weightDays.has(todayKey) },
    { id: "hydration_goal_today", label: "Hit hydration goal today", rewardXp: 20, completed: hydrationGoalHitToday },
  ];
  const questXp = quests.filter((quest) => quest.completed).reduce((sum, quest) => sum + quest.rewardXp, 0);
  const xp = baseXp + questXp;
  const { level, xpIntoLevel, xpForNextLevel } = legacyGetXpLevelProgress(xp);
  const rank = legacyRankFromLevel(level);
  const weeklyGoalTarget = 5;
  const weeklyGoalProgress = Math.min(weeklyGoalTarget, globalStreak);
  const streakFreezeCharges = Math.max(0, Math.min(3, Math.floor(level / 5) + (adherence >= 80 ? 1 : 0)));

  const badges: string[] = [];
  if (globalStreak >= 3) badges.push("3-day momentum");
  if (globalStreak >= 7) badges.push("Week warrior");
  if (bestGlobalStreak >= 14) badges.push("Unbreakable");
  if (mealStreak >= 5) badges.push("Meal consistency");
  if (workoutDays.size >= 12) badges.push("Training builder");
  if (weightDays.size >= 8) badges.push("Trend tracker");
  if (hydrationStreak >= 5) badges.push("Hydration hero");
  if (adherence >= 80) badges.push("Adherence pro");

  return {
    globalStreak,
    bestGlobalStreak,
    mealStreak,
    workoutStreak,
    weightStreak,
    hydrationStreak,
    xp,
    level,
    rank,
    xpIntoLevel,
    xpForNextLevel,
    badges: badges.slice(0, 4),
    streakFreezeCharges,
    quests,
    dailyQuestsCompleted: quests.filter((quest) => quest.completed).length,
    weeklyGoalProgress,
    weeklyGoalTarget,
  };
}
