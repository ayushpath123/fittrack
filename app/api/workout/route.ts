import { NextRequest, NextResponse } from "next/server";
import { requireUserIdFromRequest } from "@/lib/auth";
import {
  createWorkoutLog,
  listWorkoutLogHistory,
  listWorkoutLogsForDate,
} from "@/lib/domain/workout-logs";
import { ensureDefaultWorkoutTemplates } from "@/lib/default-workout-templates";
import { workoutLogPayloadSchema } from "@/lib/validators";
import { trackEvent } from "@/lib/analytics";

export async function GET(req: NextRequest) {
  const userId = await requireUserIdFromRequest(req);
  const dateStr = req.nextUrl.searchParams.get("date") ?? undefined;
  const history = req.nextUrl.searchParams.get("history");

  if (history === "1") {
    const limit = Math.min(100, parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10) || 50);
    const logs = await listWorkoutLogHistory(userId, limit);
    return NextResponse.json(logs);
  }

  const logs = await listWorkoutLogsForDate(userId, dateStr);
  return NextResponse.json(logs);
}

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserIdFromRequest(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = workoutLogPayloadSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid workout payload", details: parsed.error.flatten() }, { status: 400 });
  }

  await ensureDefaultWorkoutTemplates(userId);

  const log = await createWorkoutLog({
    userId,
    ...parsed.data,
  });

  trackEvent("workout_logged", { userId, meta: { workoutType: parsed.data.workoutType } });
  return NextResponse.json(log);
}
