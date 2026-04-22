import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasProAccess, proRequiredResponse } from "@/lib/billing";
import { checkMealCache } from "@/lib/ai/meal-cache";
import { buildUserContext } from "@/lib/ai/user-state";
import { validateMealOutput } from "@/lib/ai/validation";
import { getProgressNarrative } from "@/lib/ai/narrative";
import { getPaywallState } from "@/lib/ai/paywall";
import { buildDeterministicInsight, buildDeterministicNudge } from "@/lib/ai/lightweight";
import {
  buildEstimationUserPrompt,
  ESTIMATION_SYSTEM_PROMPT,
} from "@/lib/ai/prompts";
import { callAnthropicJson, LlmHttpError } from "@/lib/ai/anthropic";
import { AI_CONFIG } from "@/lib/ai/config";
import { enforceAiBudget } from "@/lib/ai/usage";
import type { MealOutput } from "@/types/nutrition";

const requestSchema = z.object({
  text: z.string().trim().min(1).max(400),
  imageBase64: z.string().min(1).optional(),
  imageMediaType: z.string().min(3).max(40).optional(),
});

const mealOutputSchema = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      quantity_estimate: z.string(),
      calories: z.number(),
      protein: z.number(),
      carbs: z.number(),
      fat: z.number(),
      confidence: z.number().min(0).max(1),
      reasoning_tag: z.string(),
    }),
  ),
  total: z.object({
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    fat: z.number(),
  }),
  overall_confidence: z.number().min(0).max(1),
  uncertainty_note: z.string(),
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
    const body = requestSchema.parse(await req.json());
    const budget = await enforceAiBudget({
      userId,
      purpose: "estimate_meal_v3",
      maxPerDay: AI_CONFIG.limits.analyzeMealPerDay,
    });
    if (!budget.ok) {
      return NextResponse.json({ error: budget.message, code: budget.code, requestId }, { status: 429 });
    }

    const cached = checkMealCache(body.text);
    if (cached) {
      return NextResponse.json({
        source: "cache",
        output: {
          items: [
            {
              name: body.text,
              quantity_estimate: "1 serving",
              calories: cached.calories,
              protein: cached.protein,
              carbs: cached.carbs,
              fat: cached.fat,
              confidence: cached.confidence,
              reasoning_tag: "common_indian_cache",
            },
          ],
          total: {
            calories: cached.calories,
            protein: cached.protein,
            carbs: cached.carbs,
            fat: cached.fat,
          },
          overall_confidence: cached.confidence,
          uncertainty_note: "Matched meal cache.",
        },
      });
    }

    const userCtx = await buildUserContext(userId);
    const mealHistory = await prisma.mealEntry.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { mealType: true, totalCalories: true },
    });

    const estText = await callAnthropicJson({
      purpose: "estimate_meal_v3",
      userId,
      system: `${ESTIMATION_SYSTEM_PROMPT}
Return strict JSON with this schema:
{"items":[{"name":"string","quantity_estimate":"string","calories":0,"protein":0,"carbs":0,"fat":0,"confidence":0.0,"reasoning_tag":"string"}],"total":{"calories":0,"protein":0,"carbs":0,"fat":0},"overall_confidence":0.0,"uncertainty_note":"string"}`,
      user: buildEstimationUserPrompt({
        userCtx,
        userText: body.text,
        imageReference: body.imageBase64 ? "attached_base64_image" : "none",
      }),
      maxTokens: AI_CONFIG.maxTokens.estimation,
      image:
        body.imageBase64 && body.imageMediaType
          ? {
              dataBase64: body.imageBase64,
              mediaType: body.imageMediaType,
            }
          : undefined,
    });

    const estimationRaw = safeJsonParse(estText);
    const estimation = mealOutputSchema.parse(estimationRaw) as MealOutput;
    const { output, warnings } = validateMealOutput(
      estimation,
      mealHistory.map((m) => ({ name: m.mealType, calories: Math.round(m.totalCalories) })),
    );

    // Profit-first path: keep analyze-meal at one LLM call only.
    const insight = buildDeterministicInsight(output, userCtx);
    const nudge = buildDeterministicNudge(output, userCtx);
    const narrative = getProgressNarrative(userCtx);
    const paywallState = getPaywallState(userCtx);

    await prisma.mealEstimate.create({
      data: {
        userId,
        calories: output.total.calories,
        protein: output.total.protein,
        carbs: output.total.carbs,
        fat: output.total.fat,
        confidence: output.overall_confidence,
        status: "draft",
        source: "llm",
      },
    });

    return NextResponse.json({ source: "llm", output, warnings, insight, narrative, nudge, paywallState });
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
    const message = error instanceof Error ? error.message : "Unable to analyze meal.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
