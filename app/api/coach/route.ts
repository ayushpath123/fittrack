import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUserIdFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasProAccess, proRequiredResponse } from "@/lib/billing";
import { buildCoachFetchedData } from "@/lib/ai/coach-data";
import { runCoachWithFunctionCalling } from "@/lib/ai/coachAgent";
import { LlmHttpError } from "@/lib/ai/anthropic";
import { AI_CONFIG } from "@/lib/ai/config";
import { enforceAiBudget } from "@/lib/ai/usage";

const historyTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000),
});

const bodySchema = z.object({
  question: z.string().trim().min(1).max(900),
  history: z.array(historyTurnSchema).max(8).optional().default([]),
});

export async function POST(req: NextRequest) {
  try {
    const requestId = crypto.randomUUID();
    const userId = await requireUserIdFromRequest(req);
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
    if (!user || !hasProAccess(user)) {
      return proRequiredResponse();
    }

    const { question, history } = bodySchema.parse(await req.json());

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

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured.", code: "AI_CONFIG", requestId },
        { status: 503 },
      );
    }

    const [coachData] = await Promise.all([buildCoachFetchedData(userId)]);

    const result = await runCoachWithFunctionCalling(apiKey, question, history, coachData, userId);

    return NextResponse.json({
      reply: result.reply,
      actions: result.actions,
      toolTrace: result.toolTrace.map((entry) => ({ name: entry.name })),
    });
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
