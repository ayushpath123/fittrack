import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getDaysAgo, toLocalDateKey } from "@/lib/date";
import { mealLoggingStreakFromDayKeys } from "@/lib/meal-logging-streak";
import { prisma } from "@/lib/prisma";

/** Meal logging streak (days in a row with ≥1 meal). Matches dashboard logic with enough history. */
export async function GET() {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ streak: 0 }, { status: 401 });
  }

  const meals = await prisma.mealEntry.findMany({
    where: {
      userId,
      date: { gte: getDaysAgo(400) },
    },
    select: { date: true },
  });

  const loggedDays = new Set(meals.map((m) => toLocalDateKey(new Date(m.date))));
  const streak = mealLoggingStreakFromDayKeys(loggedDays);

  return NextResponse.json({ streak });
}
