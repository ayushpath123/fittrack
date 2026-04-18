import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const { id } = await params;
  const body = await req.json();
  const updated = await prisma.mealEntry.updateMany({
    where: { id, userId },
    data: {
      mealType: body.mealType,
      totalCalories: body.totalCalories,
      totalProtein: body.totalProtein,
      totalCarbs: body.totalCarbs,
      totalFat: body.totalFat,
    },
  });
  if (updated.count === 0) return NextResponse.json({ error: "Meal not found" }, { status: 404 });
  const meal = await prisma.mealEntry.findFirst({ where: { id, userId } });
  return NextResponse.json(meal);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const { id } = await params;
  const deleted = await prisma.mealEntry.deleteMany({ where: { id, userId } });
  if (!deleted.count) return NextResponse.json({ error: "Meal not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
