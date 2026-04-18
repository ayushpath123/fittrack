import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";

const MAX_EXPORT_ROWS = 10000;

export async function GET(req: NextRequest) {
  const userId = await requireUserId();
  const format = req.nextUrl.searchParams.get("format") ?? "json";

  const [mealCount, workoutCount, weightCount, hydrationCount] = await Promise.all([
    prisma.mealEntry.count({ where: { userId } }),
    prisma.workout.count({ where: { userId } }),
    prisma.weightLog.count({ where: { userId } }),
    prisma.hydrationLog.count({ where: { userId } }),
  ]);
  const totalRows = mealCount + workoutCount + weightCount + hydrationCount;
  if (totalRows > MAX_EXPORT_ROWS) {
    return NextResponse.json(
      { error: `Export too large (${totalRows} rows). Please export in smaller date ranges.` },
      { status: 413 },
    );
  }

  const [user, goals, meals, workouts, weightLogs, hydrationLogs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, createdAt: true },
    }),
    prisma.goalSetting.findUnique({ where: { userId } }),
    prisma.mealEntry.findMany({
      where: { userId },
      orderBy: { date: "asc" },
      select: {
        id: true,
        userId: true,
        estimateId: true,
        date: true,
        mealType: true,
        items: true,
        totalCalories: true,
        totalProtein: true,
        totalCarbs: true,
        totalFat: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.workout.findMany({
      where: { userId },
      orderBy: { date: "asc" },
      include: { exercises: true },
    }),
    prisma.weightLog.findMany({ where: { userId }, orderBy: { date: "asc" } }),
    prisma.hydrationLog.findMany({ where: { userId }, orderBy: { date: "asc" } }),
  ]);

  if (format === "csv") {
    const header = "date,weight_kg,waist_cm\n";
    const rows = weightLogs
      .map((w) => `${w.date.toISOString()},${w.weight},${w.waistCm ?? ""}`)
      .join("\n");
    return new NextResponse(header + rows, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="fittrack-weights.csv"',
      },
    });
  }

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    version: 1,
    user,
    goals,
    meals: meals.map((m) => ({
      ...m,
      date: m.date.toISOString(),
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    })),
    workouts: workouts.map((w) => ({
      ...w,
      date: w.date.toISOString(),
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
    })),
    weightLogs: weightLogs.map((w) => ({
      ...w,
      date: w.date.toISOString(),
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
    })),
    hydrationLogs: hydrationLogs.map((h) => ({
      ...h,
      date: h.date.toISOString(),
      createdAt: h.createdAt.toISOString(),
      updatedAt: h.updatedAt.toISOString(),
    })),
  });
}
