import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUserIdFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasProAccess, proRequiredResponse } from "@/lib/billing";
import { confirmVoiceLogs } from "@/lib/voice/loggingAgent";
import type { VoiceLogPayload } from "@/lib/voice/types";

const payloadSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("meal_template"), templateId: z.string(), servings: z.number().optional() }),
  z.object({
    kind: z.literal("meal_food"),
    foodId: z.string(),
    multiplier: z.number().optional(),
    grams: z.number().optional(),
  }),
  z.object({
    kind: z.literal("meal_macros"),
    name: z.string(),
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    fat: z.number(),
  }),
  z.object({ kind: z.literal("workout_template"), templateId: z.string(), duration: z.number().optional() }),
  z.object({
    kind: z.literal("cardio"),
    name: z.string(),
    durationMinutes: z.number(),
    caloriesBurned: z.number().optional(),
  }),
  z.object({ kind: z.literal("hydration"), addMl: z.number() }),
  z.object({ kind: z.literal("weight"), weightKg: z.number(), waistCm: z.number().optional() }),
]);

const bodySchema = z.object({
  items: z
    .array(
      z.object({
        draftId: z.string(),
        payload: payloadSchema,
        matchId: z.string().optional(),
      }),
    )
    .min(1)
    .max(20),
  date: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserIdFromRequest(req);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, email: true, subscriptionStatus: true },
    });
    if (!user || !hasProAccess(user)) {
      return proRequiredResponse();
    }

    const parsed = bodySchema.parse(await req.json());

    const items = parsed.items.map((item) => {
      let payload = item.payload as VoiceLogPayload;
      if (item.matchId) {
        if (payload.kind === "meal_template" || payload.kind === "workout_template") {
          payload = { ...payload, templateId: item.matchId };
        } else if (payload.kind === "meal_food") {
          payload = { ...payload, foodId: item.matchId };
        }
      }
      return { draftId: item.draftId, payload };
    });

    const result = await confirmVoiceLogs(userId, items, parsed.date);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Confirm failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
