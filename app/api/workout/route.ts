import { NextRequest, NextResponse } from "next/server";
import { ExerciseEntryType } from "@/types";
import { requireUserIdFromRequest } from "@/lib/auth";
import { workoutPayloadSchema } from "@/lib/validators";
import { getWorkoutForDate, upsertWorkoutForDate } from "@/lib/domain/tracking";

export async function GET(req: NextRequest) {
  const userId = await requireUserIdFromRequest(req);
  const dateStr = req.nextUrl.searchParams.get("date") ?? undefined;
  const workout = await getWorkoutForDate(userId, dateStr);
  return NextResponse.json(workout);
}

export async function POST(req: NextRequest) {
  const userId = await requireUserIdFromRequest(req);
  const parsed = workoutPayloadSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid workout payload", details: parsed.error.flatten() }, { status: 400 });
  }
  const { date, exercises, caloriesBurned } = parsed.data as {
    date: string;
    exercises: ExerciseEntryType[];
    caloriesBurned?: number;
  };
  const workout = await upsertWorkoutForDate({ userId, date, exercises, caloriesBurned });
  return NextResponse.json(workout);
}
