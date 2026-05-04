import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasProAccess, proRequiredResponse } from "@/lib/billing";
import { buildUserContext } from "@/lib/ai/user-state";
import { callAnthropicJson, LlmHttpError } from "@/lib/ai/anthropic";
import { AI_CONFIG } from "@/lib/ai/config";
import { enforceAiBudget } from "@/lib/ai/usage";
import { COACH_SYSTEM_PROMPT } from "@/lib/ai/prompts";

const bodySchema = z.object({
  question: z.string().trim().min(1).max(900),
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
    const { question } = bodySchema.parse(await req.json());
    const [dailyBudget, monthlyBudget] = await Promise.all([
      enforceAiBudget({ userId, purpose: "coach_v3", maxPerDay: AI_CONFIG.limits.coachPerDay }),
      enforceAiBudget({ userId, purpose: "coach_v3", maxPerMonth: AI_CONFIG.limits.coachPerMonth }),
    ]);
    if (!dailyBudget.ok) {
      return NextResponse.json({ error: dailyBudget.message, code: dailyBudget.code, requestId }, { status: 429 });
    }
    if (!monthlyBudget.ok) {
      return NextResponse.json({ error: monthlyBudget.message, code: monthlyBudget.code, requestId }, { status: 429 });
    }
    const userCtx = await buildUserContext(userId);

    const weekly = await prisma.mealEntry.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 14,
      select: { date: true, mealType: true, totalCalories: true, totalProtein: true },
    });

    const userPrompt = `USER DATA:
Goal=${userCtx.goal}, Weight=${userCtx.current_weight ?? "unknown"}, Activity=${userCtx.activity}
Targets: ${userCtx.calorie_target} kcal, ${userCtx.protein_target}g protein
7d avg: ${userCtx.avg_daily_calories_7d} kcal, protein hit rate ${userCtx.protein_hit_rate}
Streak: ${userCtx.streak_days} days
Recent meals compact: ${JSON.stringify(weekly)}

QUESTION: "${question}"`;

    const responseText = await callAnthropicJson({
      purpose: "coach_v3",
      userId,
      system: `${COACH_SYSTEM_PROMPT}
Return strict JSON:
{"diagnosis":"string","key_issues":["string"],"action_plan":["string"],"expected_impact":"string","confidence":0.0}`,
      user: userPrompt,
      maxTokens: AI_CONFIG.maxTokens.coach,
    });

    const parsed = safeJsonParse(responseText);
    return NextResponse.json(
      parsed ?? {
        diagnosis: "Pattern is unclear from current logs.",
        key_issues: ["Inconsistent logging"],
        action_plan: ["Log every main meal for 3 days", "Hit protein target once daily"],
        expected_impact: "Cleaner data and better calorie control.",
        confidence: 0.6,
      },
    );
  } catch (error) {
    if (error instanceof LlmHttpError) {
      if (error.status === 429) {
        return NextResponse.json(
          { error: "AI provider quota exceeded. Please try again later.", code: "AI_RATE_LIMIT" },
          { status: 429 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: error.status >= 400 ? error.status : 502 });
    }
    const message = error instanceof Error ? error.message : "Coach unavailable.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
