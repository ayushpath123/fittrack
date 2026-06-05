import { NextRequest, NextResponse } from "next/server";
import { requireUserIdFromRequest } from "@/lib/auth";
import { getWorkoutSummaryForDate, getWorkoutSummaryForWeek } from "@/lib/domain/workout-logs";

export async function GET(req: NextRequest) {
  const userId = await requireUserIdFromRequest(req);
  const dateStr = req.nextUrl.searchParams.get("date") ?? undefined;

  const [today, week] = await Promise.all([
    getWorkoutSummaryForDate(userId, dateStr),
    getWorkoutSummaryForWeek(userId),
  ]);

  return NextResponse.json({ today, week });
}
