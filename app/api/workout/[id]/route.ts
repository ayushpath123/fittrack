export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { requireUserIdFromRequest } from "@/lib/auth";
import { deleteWorkoutLog, updateWorkoutLog } from "@/lib/domain/workout-logs";
import { workoutLogPatchSchema } from "@/lib/validators";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let userId: string;
  try {
    userId = await requireUserIdFromRequest(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const parsed = workoutLogPatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid workout update", details: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await updateWorkoutLog(userId, id, parsed.data);
  if (!updated) return NextResponse.json({ error: "Workout not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let userId: string;
  try {
    userId = await requireUserIdFromRequest(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const deleted = await deleteWorkoutLog(userId, id);
  if (!deleted) return NextResponse.json({ error: "Workout not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
