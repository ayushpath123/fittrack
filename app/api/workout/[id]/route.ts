export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";

export async function PATCH(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const { id } = await params;
  const updated = await prisma.workout.updateMany({ where: { id, userId }, data: { completed: true } });
  if (!updated.count) return NextResponse.json({ error: "Workout not found" }, { status: 404 });
  const workout = await prisma.workout.findFirst({ where: { id, userId } });
  return NextResponse.json(workout);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const { id } = await params;
  const deleted = await prisma.workout.deleteMany({ where: { id, userId } });
  if (!deleted.count) return NextResponse.json({ error: "Workout not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
