export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserIdFromRequest } from "@/lib/auth";
import { workoutPatchSchema } from "@/lib/validators";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserIdFromRequest(req);
  const { id } = await params;
  const parsed = workoutPatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid workout update", details: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.workout.updateMany({
    where: { id, userId },
    data: {
      ...(parsed.data.completed !== undefined ? { completed: parsed.data.completed } : {}),
      ...(parsed.data.caloriesBurned !== undefined ? { caloriesBurned: parsed.data.caloriesBurned } : {}),
    },
  });
  if (!updated.count) return NextResponse.json({ error: "Workout not found" }, { status: 404 });

  const workout = await prisma.workout.findFirst({ where: { id, userId }, include: { exercises: true } });
  return NextResponse.json(workout);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserIdFromRequest(req);
  const { id } = await params;
  const deleted = await prisma.workout.deleteMany({ where: { id, userId } });
  if (!deleted.count) return NextResponse.json({ error: "Workout not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
