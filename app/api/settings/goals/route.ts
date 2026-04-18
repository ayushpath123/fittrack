import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { goalsPayloadSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const goals = await prisma.goalSetting.findUnique({ where: { userId } });
  return NextResponse.json(
    goals ?? {
      calorieTarget: 1500,
      proteinTarget: 110,
      carbTarget: 180,
      fatTarget: 55,
      waterTargetMl: 2000,
      reminderEnabled: false,
      reminderTime: "09:00",
    },
  );
}

export async function PUT(req: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = goalsPayloadSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid goals payload", details: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const goals = await prisma.goalSetting.upsert({
      where: { userId },
      update: parsed.data,
      create: { userId, ...parsed.data },
    });
    return NextResponse.json(goals);
  } catch (e) {
    console.error("[goals PUT]", e);
    return NextResponse.json({ error: "Could not save goals. Try again or sign out and back in." }, { status: 500 });
  }
}
