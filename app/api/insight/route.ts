import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasProAccess, proRequiredResponse } from "@/lib/billing";
import { buildUserContext } from "@/lib/ai/user-state";
import { buildDeterministicInsight } from "@/lib/ai/lightweight";
import { AI_CONFIG } from "@/lib/ai/config";
import { enforceAiBudget } from "@/lib/ai/usage";
import type { MealOutput } from "@/types/nutrition";

const mealSchema = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      quantity_estimate: z.string(),
      calories: z.number(),
      protein: z.number(),
      carbs: z.number(),
      fat: z.number(),
      confidence: z.number(),
      reasoning_tag: z.string(),
    }),
  ),
  total: z.object({ calories: z.number(), protein: z.number(), carbs: z.number(), fat: z.number() }),
  overall_confidence: z.number(),
  uncertainty_note: z.string(),
});

export async function POST(req: Request) {
  try {
    const requestId = crypto.randomUUID();
    const userId = await requireUserId();
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
    if (!user || !hasProAccess(user)) {
      return proRequiredResponse();
    }
    const body = z.object({ meal: mealSchema }).parse(await req.json());
    const budget = await enforceAiBudget({
      userId,
      purpose: "insight_v3_direct",
      maxPerDay: AI_CONFIG.limits.insightPerDay,
    });
    if (!budget.ok) {
      return NextResponse.json({ error: budget.message, code: budget.code, requestId }, { status: 429 });
    }
    const userCtx = await buildUserContext(userId);
    const insight = buildDeterministicInsight(body.meal as MealOutput, userCtx);
    return NextResponse.json(insight);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Insight unavailable.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
