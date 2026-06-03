/** Meal logging streak required before Arena / leaderboards appear in More. */
export const REWARDS_UNLOCK_STREAK = 3;

export function rewardsUnlocked(mealLoggingStreak: number): boolean {
  return mealLoggingStreak >= REWARDS_UNLOCK_STREAK;
}
