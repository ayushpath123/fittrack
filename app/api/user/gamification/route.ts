import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { fetchGamificationSummaryForUser, getRequestAuditMeta, GamificationHttpError } from "@/lib/gamification-server";
import { gamificationErrorResponse } from "@/app/api/gamification/_http";

/** @deprecated Prefer `GET /api/gamification/summary` — kept for backwards compatibility. */
export async function GET(req: Request) {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const summary = await fetchGamificationSummaryForUser(userId, {
      leaderboard: true,
      auditStreakSync: false,
      reqMeta: getRequestAuditMeta(req),
    });
    return NextResponse.json(summary);
  } catch (e) {
    if (e instanceof GamificationHttpError && e.statusCode === 403) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return gamificationErrorResponse(e);
  }
}
