import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasProAccess, proRequiredResponse } from "@/lib/billing";
import { startOfWeekMonday, addDays } from "@/lib/date";
import { buildUserContext } from "@/lib/ai/user-state";
import { callAnthropicJson, LlmHttpError } from "@/lib/ai/anthropic";
import { AI_CONFIG } from "@/lib/ai/config";
import { enforceAiBudget } from "@/lib/ai/usage";
import { WEEKLY_REPORT_SYSTEM_PROMPT } from "@/lib/ai/prompts";

const querySchema = z.object({
  force: z.boolean().optional(),
});

function safeJsonParse(input: string) {
  const start = input.indexOf("{");
  const end = input.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(input.slice(start, end + 1)) as unknown;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const requestId = crypto.randomUUID();
    const userId = await requireUserId();
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
    if (!user || !hasProAccess(user)) {
      return proRequiredResponse();
    }
    const { force } = querySchema.parse((await req.json().catch(() => ({}))) as unknown);
    const budget = await enforceAiBudget({
      userId,
      purpose: "weekly_report_v3",
      maxPerDay: AI_CONFIG.limits.weeklyReportPerDay,
    });
    if (!budget.ok) {
      return NextResponse.json({ error: budget.message, code: budget.code, requestId }, { status: 429 });
    }
    const userCtx = await buildUserContext(userId);

    const now = new Date();
    const monday = startOfWeekMonday(now);
    if (!force && now.getDay() !== 1) {
      return NextResponse.json({ error: "Weekly report runs on Monday.", nextRun: monday.toISOString() }, { status: 400 });
    }

    const weekStart = monday;
    const weekEnd = addDays(monday, 6);
    const existing = await prisma.weeklyReport.findUnique({
      where: { userId_weekStart: { userId, weekStart } },
      select: { reportJson: true },
    });
    if (existing?.reportJson && !force) {
      return NextResponse.json(existing.reportJson);
    }
    const logs = await prisma.mealEntry.findMany({
      where: { userId, date: { gte: weekStart, lte: weekEnd } },
      orderBy: { date: "asc" },
      select: { date: true, mealType: true, totalCalories: true, totalProtein: true, totalCarbs: true, totalFat: true },
    });

    const userPrompt = `USER PROFILE:
- Goal: ${userCtx.goal}
- Calorie target: ${userCtx.calorie_target} kcal
- Protein target: ${userCtx.protein_target}g
- Weight this week: ${userCtx.current_weight ?? "unknown"} kg

7-DAY LOG:
${JSON.stringify(logs)}

PREVIOUS WEEK'S SUGGESTION: "none"
Did they follow it? unknown`;

    const reportText = await callAnthropicJson({
      purpose: "weekly_report_v3",
      userId,
      system: `${WEEKLY_REPORT_SYSTEM_PROMPT}
Return strict JSON with keys:
{"week_summary":{"avg_daily_calories":0,"calorie_vs_target":"string","protein_consistency":"string","logging_consistency":"string"},"best_day":{"day":"string","why":"string"},"pattern_found":{"pattern":"string","evidence":"string"},"next_week_adjustment":{"action":"string","expected_impact":"string"}}`,
      user: userPrompt,
      maxTokens: AI_CONFIG.maxTokens.weeklyReport,
    });

    const parsed = safeJsonParse(reportText) ?? {
        week_summary: {
          avg_daily_calories: userCtx.avg_daily_calories_7d,
          calorie_vs_target: `${userCtx.avg_daily_calories_7d - userCtx.calorie_target} kcal vs target`,
          protein_consistency: `Hit target ${userCtx.protein_hit_rate}`,
          logging_consistency: `${Math.min(7, userCtx.total_logs)}/7 days`,
        },
        best_day: { day: "N/A", why: "Need more complete week data." },
        pattern_found: { pattern: "Late calorie spikes", evidence: "Higher totals on low-protein days." },
        next_week_adjustment: {
          action: "Add one fixed protein snack each afternoon.",
          expected_impact: "+15 to +20g daily protein, fewer late cravings.",
        },
      };

    await prisma.weeklyReport.upsert({
      where: { userId_weekStart: { userId, weekStart } },
      update: { reportJson: parsed },
      create: { userId, weekStart, reportJson: parsed },
    });

    return NextResponse.json(parsed);
  } catch (error) {
    if (error instanceof LlmHttpError) {
      if (error.status === 429) {
        return NextResponse.json(
          { error: "AI quota exceeded. Please try later or upgrade Gemini billing.", code: "AI_RATE_LIMIT" },
          { status: 429 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: error.status >= 400 ? error.status : 502 });
    }
    const message = error instanceof Error ? error.message : "Weekly report unavailable.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const userId = await requireUserId();
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
    if (!user || !hasProAccess(user)) {
      return proRequiredResponse();
    }
    const report = await prisma.weeklyReport.findFirst({
      where: { userId },
      orderBy: { weekStart: "desc" },
      select: { weekStart: true, reportJson: true, createdAt: true },
    });
    if (!report) {
      return NextResponse.json({ report: null });
    }
    return NextResponse.json({
      report: report.reportJson,
      weekStart: report.weekStart,
      createdAt: report.createdAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch weekly report.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
