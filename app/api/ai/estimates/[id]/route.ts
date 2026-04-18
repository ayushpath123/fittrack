import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { aiEstimateUpdateSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const parsed = aiEstimateUpdateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid estimate update payload", details: parsed.error.flatten() }, { status: 400 });
    }
    const updated = await prisma.mealEstimate.updateMany({
      where: { id, userId },
      data: parsed.data,
    });
    if (updated.count === 0) return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
    const estimate = await prisma.mealEstimate.findFirst({ where: { id, userId } });
    return NextResponse.json(estimate);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
