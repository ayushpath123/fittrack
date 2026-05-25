import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserIdFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserIdFromRequest(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const goals = await prisma.goalSetting.findUnique({ where: { userId } });
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true },
  });

  return NextResponse.json({
    needsOnboarding: !goals,
    emailVerified: !!user?.emailVerified,
  });
}
