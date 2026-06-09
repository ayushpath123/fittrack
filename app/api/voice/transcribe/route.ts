import { NextRequest, NextResponse } from "next/server";
import { requireUserIdFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasProAccess, proRequiredResponse } from "@/lib/billing";
import { AI_CONFIG } from "@/lib/ai/config";
import { enforceAiBudget } from "@/lib/ai/usage";
import { LlmHttpError } from "@/lib/ai/anthropic";
import { transcribeAudioWithGemini } from "@/lib/voice/transcribeAudio";

const MAX_BYTES = 5 * 1024 * 1024;

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

    const [dailyBudget, monthlyBudget] = await Promise.all([
      enforceAiBudget({ userId, purpose: "voice_transcribe", maxPerDay: AI_CONFIG.limits.voicePerDay }),
      enforceAiBudget({ userId, purpose: "voice_transcribe", maxPerMonth: AI_CONFIG.limits.voicePerMonth }),
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

    const form = await req.formData();
    const file = form.get("audio");
    if (!(file instanceof Blob) || file.size === 0) {
      return NextResponse.json({ error: "Missing audio recording.", requestId }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Recording too long. Keep it under 30 seconds.", requestId }, { status: 400 });
    }

    const mimeType = file.type || "audio/webm";
    const buffer = Buffer.from(await file.arrayBuffer());
    const transcript = await transcribeAudioWithGemini(apiKey, buffer.toString("base64"), mimeType, userId);

    return NextResponse.json({ transcript, requestId });
  } catch (error) {
    if (error instanceof LlmHttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status >= 400 ? error.status : 502 });
    }
    const message = error instanceof Error ? error.message : "Transcription failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
