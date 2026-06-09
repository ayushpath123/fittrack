import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUserIdFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasProAccess, proRequiredResponse } from "@/lib/billing";
import { AI_CONFIG } from "@/lib/ai/config";
import { enforceAiBudget } from "@/lib/ai/usage";
import { LlmHttpError } from "@/lib/ai/anthropic";
import { processVoiceTranscript } from "@/lib/voice/voiceAgent";

const bodySchema = z.object({
  transcript: z.string().trim().min(1).max(2000),
});

export async function POST(req: NextRequest) {
  try {
    const requestId = crypto.randomUUID();
    const userId = await requireUserIdFromRequest(req);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, email: true, subscriptionStatus: true },
    });
    if (!user || !hasProAccess(user)) {
      return proRequiredResponse();
    }

    const { transcript } = bodySchema.parse(await req.json());

    const [dailyBudget, monthlyBudget] = await Promise.all([
      enforceAiBudget({ userId, purpose: "voice_nlp", maxPerDay: AI_CONFIG.limits.voicePerDay }),
      enforceAiBudget({ userId, purpose: "voice_nlp", maxPerMonth: AI_CONFIG.limits.voicePerMonth }),
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

    const result = await processVoiceTranscript(apiKey, userId, transcript);

    return NextResponse.json({ ...result, requestId });
  } catch (error) {
    if (error instanceof LlmHttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status >= 400 ? error.status : 502 });
    }
    const message = error instanceof Error ? error.message : "Voice processing failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
