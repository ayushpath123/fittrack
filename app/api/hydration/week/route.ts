import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { addDays, startOfDay, toLocalDateKey } from "@/lib/date";

export const dynamic = "force-dynamic";

/** Last 7 local days including today — total ml per day (missing days = 0). */
export async function GET() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const end = startOfDay(new Date());
  const start = addDays(end, -6);
  const logs = await prisma.hydrationLog.findMany({
    where: { userId, date: { gte: start, lte: end } },
    orderBy: { date: "asc" },
  });

  const byKey = new Map<string, number>();
  for (const l of logs) {
    byKey.set(toLocalDateKey(new Date(l.date)), l.totalMl);
  }

  const days: { date: string; totalMl: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(end, -i);
    const k = toLocalDateKey(d);
    days.push({ date: k, totalMl: byKey.get(k) ?? 0 });
  }

  return NextResponse.json({ days });
}
