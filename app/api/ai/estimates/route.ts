import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? 12);
    const limit = Number.isFinite(limitRaw) ? Math.min(50, Math.max(1, Math.floor(limitRaw))) : 12;
    const estimates = await prisma.mealEstimate.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return NextResponse.json(estimates);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
