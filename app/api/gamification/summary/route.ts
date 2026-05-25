import { NextResponse } from "next/server";
import { fetchGamificationSummaryForUser, getRequestAuditMeta, GamificationHttpError } from "@/lib/gamification-server";
import { gamificationErrorResponse, requireGamificationUserId } from "../_http";

export async function GET(req: Request) {
  const auth = await requireGamificationUserId();
  if (!auth.ok) return auth.response;

  try {
    const meta = getRequestAuditMeta(req);
    const summary = await fetchGamificationSummaryForUser(auth.userId, {
      leaderboard: true,
      auditStreakSync: false,
      reqMeta: meta,
    });
    return NextResponse.json(summary);
  } catch (e) {
    if (e instanceof GamificationHttpError && e.statusCode === 403) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return gamificationErrorResponse(e);
  }
}
