export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireUserIdFromRequest } from "@/lib/auth";
import { getWorkoutAnalytics } from "@/lib/workout-analytics";

export async function GET(req: NextRequest) {
  const userId = await requireUserIdFromRequest(req);
  const analytics = await getWorkoutAnalytics(userId);
  return NextResponse.json(analytics);
}
