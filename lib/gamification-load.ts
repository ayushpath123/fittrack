import { fetchGamificationSummaryForUser } from "@/lib/gamification-server";
import type { GamificationSummary } from "@/lib/gamification";

/**
 * Loads the authoritative gamification snapshot (same shape as `GET /api/gamification/summary`).
 */
export async function loadGamificationSummaryForUser(userId: string): Promise<GamificationSummary> {
  return fetchGamificationSummaryForUser(userId, {
    leaderboard: true,
    auditStreakSync: false,
    reqMeta: { ipAddress: null, userAgent: null },
  });
}
