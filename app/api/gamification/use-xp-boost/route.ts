import { NextResponse } from "next/server";
import { getRequestAuditMeta, GamificationHttpError, applyXpBoostMutation } from "@/lib/gamification-server";
import { gamificationErrorResponse, requireGamificationUserId } from "../_http";

export async function POST(req: Request) {
  const auth = await requireGamificationUserId();
  if (!auth.ok) return auth.response;

  try {
    const summary = await applyXpBoostMutation(auth.userId, getRequestAuditMeta(req));
    return NextResponse.json(summary);
  } catch (e) {
    if (e instanceof GamificationHttpError && e.statusCode === 403) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return gamificationErrorResponse(e);
  }
}
