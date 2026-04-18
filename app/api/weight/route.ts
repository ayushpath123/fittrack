import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDaysAgo, startOfDay } from "@/lib/date";
import { requireUserId } from "@/lib/auth";
import { weightPayloadSchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
  const userId = await requireUserId();
  const range = req.nextUrl.searchParams.get("range") ?? "7d";
  const days = range === "30d" ? 30 : 7;
  const logs = await prisma.weightLog.findMany({
    where: { userId, date: { gte: getDaysAgo(days - 1) } },
    orderBy: { date: "asc" },
  });
  return NextResponse.json(logs);
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  const parsed = weightPayloadSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid weight payload", details: parsed.error.flatten() }, { status: 400 });
  }
  const { date, weight, waistCm } = parsed.data;
  const d = startOfDay(new Date(date));
  const log = await prisma.weightLog.upsert({
    where: { userId_date: { userId, date: d } },
    update: { weight, ...(waistCm !== undefined ? { waistCm } : {}) },
    create: { userId, date: d, weight, ...(waistCm !== undefined ? { waistCm } : {}) },
  });
  return NextResponse.json(log);
}
