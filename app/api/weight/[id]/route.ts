import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { weightPatchSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const { id } = await params;
  const parsed = weightPatchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid patch", details: parsed.error.flatten() }, { status: 400 });
  }
  const data: { weight?: number; waistCm?: number | null } = {};
  if (parsed.data.weight !== undefined) data.weight = parsed.data.weight;
  if (parsed.data.waistCm !== undefined) data.waistCm = parsed.data.waistCm;
  const updated = await prisma.weightLog.updateMany({ where: { id, userId }, data });
  if (!updated.count) return NextResponse.json({ error: "Weight log not found" }, { status: 404 });
  const log = await prisma.weightLog.findFirst({ where: { id, userId } });
  return NextResponse.json(log);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const { id } = await params;
  const deleted = await prisma.weightLog.deleteMany({ where: { id, userId } });
  if (!deleted.count) return NextResponse.json({ error: "Weight log not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
