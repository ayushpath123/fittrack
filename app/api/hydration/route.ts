import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { hydrationPostSchema } from "@/lib/validators";
import { startOfDay, toLocalDateKey } from "@/lib/date";

export async function GET(req: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dateStr = req.nextUrl.searchParams.get("date") ?? toLocalDateKey(new Date());
  const d = startOfDay(new Date(dateStr));
  const [log, goals] = await Promise.all([
    prisma.hydrationLog.findUnique({ where: { userId_date: { userId, date: d } } }),
    prisma.goalSetting.findUnique({ where: { userId } }),
  ]);
  const goalMl = goals?.waterTargetMl ?? 2000;
  return NextResponse.json({
    date: dateStr,
    totalMl: log?.totalMl ?? 0,
    goalMl,
  });
}

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = hydrationPostSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const { addMl, date: dateOpt } = parsed.data;
  const dateStr = dateOpt ?? toLocalDateKey(new Date());
  const d = startOfDay(new Date(dateStr));

  const row = await prisma.hydrationLog.upsert({
    where: { userId_date: { userId, date: d } },
    update: { totalMl: { increment: addMl } },
    create: { userId, date: d, totalMl: addMl },
  });

  const goals = await prisma.goalSetting.findUnique({ where: { userId } });
  const goalMl = goals?.waterTargetMl ?? 2000;

  return NextResponse.json({
    date: dateStr,
    totalMl: row.totalMl,
    goalMl,
  });
}
