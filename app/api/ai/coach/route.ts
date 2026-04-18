import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { endOfDay, getDaysAgo, startOfDay, toLocalDateKey } from "@/lib/date";
import { runCoachWithFunctionCalling, type CoachHistoryTurn } from "@/lib/ai/coachAgent";
import { hasProAccess, proRequiredResponse } from "@/lib/billing";
import { checkAiRateLimit } from "@/lib/ai/rateLimit";
import { aiLog } from "@/lib/ai/log";

const bodySchema = z.object({
  message: z.string().trim().min(1).max(900),
  threadId: z.string().min(1).max(64).optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(900),
      }),
    )
    .max(12)
    .optional()
    .default([]),
});

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });
    if (!user || !hasProAccess(user)) {
      return proRequiredResponse();
    }

    const rl = checkAiRateLimit(userId, "coach");
    if (!rl.ok) {
      return NextResponse.json({ error: "RATE_LIMIT", retryAfterSec: rl.retryAfterSec }, { status: 429 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not configured." }, { status: 500 });
    }

    const jsonBody = (await req.json()) as unknown;
    const parsed = bodySchema.safeParse(jsonBody);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid message", details: parsed.error.flatten() }, { status: 400 });
    }
    const { message, history, threadId: threadIdIn } = parsed.data;

    let historyForCoach: CoachHistoryTurn[];
    let activeThreadId: string;

    if (threadIdIn) {
      const thread = await prisma.coachThread.findFirst({
        where: { id: threadIdIn, userId },
      });
      if (!thread) {
        return NextResponse.json({ error: "Thread not found." }, { status: 404 });
      }
      await prisma.coachMessage.create({
        data: { threadId: thread.id, role: "user", content: message },
      });
      const msgs = await prisma.coachMessage.findMany({
        where: { threadId: thread.id },
        orderBy: { createdAt: "asc" },
      });
      const last = msgs[msgs.length - 1];
      if (!last || last.role !== "user") {
        return NextResponse.json({ error: "Invalid thread state." }, { status: 400 });
      }
      historyForCoach = msgs
        .slice(0, -1)
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
      activeThreadId = thread.id;
      await prisma.coachThread.update({
        where: { id: thread.id },
        data: { updatedAt: new Date() },
      });
    } else {
      const thread = await prisma.coachThread.create({
        data: { userId },
      });
      await prisma.coachMessage.create({
        data: { threadId: thread.id, role: "user", content: message },
      });
      historyForCoach = history;
      activeThreadId = thread.id;
    }

    const today = new Date();
    const dayStart = startOfDay(today);
    const weekStart = getDaysAgo(6);
    const [goals, todayMeals, weekMeals, weekWorkouts, recentWeights, hydrationToday] = await Promise.all([
      prisma.goalSetting.findUnique({ where: { userId } }),
      prisma.mealEntry.findMany({
        where: { userId, date: { gte: dayStart, lte: endOfDay(today) } },
        select: { totalCalories: true, totalProtein: true },
      }),
      prisma.mealEntry.findMany({
        where: { userId, date: { gte: weekStart, lte: endOfDay(today) } },
        select: { date: true, totalCalories: true, totalProtein: true },
      }),
      prisma.workout.count({
        where: { userId, date: { gte: weekStart, lte: endOfDay(today) }, completed: true },
      }),
      prisma.weightLog.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: 10,
        select: { date: true, weight: true },
      }),
      prisma.hydrationLog.findUnique({ where: { userId_date: { userId, date: dayStart } } }),
    ]);

    const calorieTarget = goals?.calorieTarget ?? 1500;
    const proteinTarget = goals?.proteinTarget ?? 110;
    const waterMl = goals?.waterTargetMl ?? 2000;

    const todayCals = todayMeals.reduce((s, m) => s + m.totalCalories, 0);
    const todayProtein = todayMeals.reduce((s, m) => s + m.totalProtein, 0);
    const daysLoggedThisWeek = new Set(weekMeals.map((m) => toLocalDateKey(new Date(m.date)))).size;
    const weekCalTotal = weekMeals.reduce((s, m) => s + m.totalCalories, 0);

    const weightRecent = recentWeights.map((w) => ({
      date: toLocalDateKey(new Date(w.date)),
      weightKg: w.weight,
    }));

    const weightSummary =
      recentWeights.length >= 2
        ? {
            latestKg: recentWeights[0].weight,
            priorKg: recentWeights[1].weight,
            deltaKg: Math.round((recentWeights[0].weight - recentWeights[1].weight) * 10) / 10,
          }
        : recentWeights.length === 1
          ? { latestKg: recentWeights[0].weight, priorKg: null, deltaKg: null }
          : { latestKg: null, priorKg: null, deltaKg: null };

    const userContext = {
      targets: { calorieTarget, proteinTarget, waterGoalMl: waterMl },
      today: {
        localDate: toLocalDateKey(today),
        caloriesSoFar: Math.round(todayCals),
        proteinSoFar: Math.round(todayProtein),
        mealsLogged: todayMeals.length,
        caloriesRemaining: Math.round(calorieTarget - todayCals),
        hydrationMl: hydrationToday?.totalMl ?? null,
      },
      rolling7d: {
        daysWithMealsLogged: daysLoggedThisWeek,
        totalCalories: Math.round(weekCalTotal),
        completedWorkouts: weekWorkouts,
      },
      weight: weightSummary,
    };

    const coachData = {
      userContext,
      targets: { calorieTarget, proteinTarget, waterGoalMl: waterMl },
      today: {
        localDate: toLocalDateKey(today),
        caloriesSoFar: Math.round(todayCals),
        proteinSoFar: Math.round(todayProtein),
        mealsLogged: todayMeals.length,
        caloriesRemaining: Math.round(calorieTarget - todayCals),
        hydrationMl: hydrationToday?.totalMl ?? null,
      },
      rolling7d: {
        daysWithMealsLogged: daysLoggedThisWeek,
        totalCalories: Math.round(weekCalTotal),
        completedWorkouts: weekWorkouts,
      },
      weight: {
        latestKg: weightSummary.latestKg,
        priorKg: weightSummary.priorKg,
        deltaKg: weightSummary.deltaKg,
        recent: weightRecent,
      },
    };

    const { reply, actions, toolTrace } = await runCoachWithFunctionCalling(apiKey, message, historyForCoach, coachData);

    await prisma.coachMessage.create({
      data: { threadId: activeThreadId, role: "assistant", content: reply },
    });
    await prisma.coachThread.update({
      where: { id: activeThreadId },
      data: { updatedAt: new Date() },
    });

    aiLog("coach_completed", {
      userId,
      threadId: activeThreadId,
      tools: toolTrace.map((t) => t.name),
    });

    return NextResponse.json({
      reply,
      actions,
      threadId: activeThreadId,
      usedTools: toolTrace.map((t) => t.name),
      toolCalls: toolTrace.map((t) => ({ name: t.name, args: t.args })),
    });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const msg = e instanceof Error ? e.message : "Coach unavailable.";
    aiLog("coach_error", { error: msg.slice(0, 200) });
    return NextResponse.json({ error: msg.slice(0, 500) }, { status: 500 });
  }
}
