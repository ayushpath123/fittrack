import { AI_CONFIG } from "@/lib/ai/config";
import { estimateLlmCostUsd } from "@/lib/ai/cost";
import { LlmHttpError } from "@/lib/ai/anthropic";
import { aiLog } from "@/lib/ai/log";

const TRANSCRIBE_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
] as const;

const TRANSCRIBE_PROMPT = `Transcribe the spoken audio exactly as said.
The speaker may use English, Hinglish, or a mix (e.g. "maine oats bowl khaya").
Return ONLY the transcript text — no quotes, labels, or explanation.
If the audio is silent or unintelligible, return an empty string.`;

function normalizeAudioMime(mimeType: string): string {
  const base = mimeType.split(";")[0]?.trim().toLowerCase() ?? "audio/webm";
  if (base === "audio/webm" || base === "audio/mp4" || base === "audio/mpeg" || base === "audio/wav") {
    return base;
  }
  return "audio/webm";
}

export async function transcribeAudioWithGemini(
  apiKey: string,
  audioBase64: string,
  mimeType: string,
  userId?: string,
): Promise<string> {
  const normalizedMime = normalizeAudioMime(mimeType);
  let lastError = "Transcription failed";
  let lastStatus = 502;

  const body = {
    contents: [
      {
        parts: [
          { inline_data: { mime_type: normalizedMime, data: audioBase64 } },
          { text: TRANSCRIBE_PROMPT },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: AI_CONFIG.maxTokens.voice,
    },
  };

  for (const model of TRANSCRIBE_MODELS) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );

    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      lastError = `Gemini non-JSON (${res.status})`;
      lastStatus = res.status >= 400 ? res.status : 502;
      continue;
    }

    type GeminiResponse = {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      error?: { message?: string };
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };
    const data = parsed as GeminiResponse;

    if (!res.ok) {
      lastError = data.error?.message ?? `Transcription failed (${res.status})`;
      lastStatus = res.status;
      if (res.status === 404 || res.status === 400 || res.status === 429 || res.status >= 500) {
        continue;
      }
      throw new LlmHttpError(lastError, res.status);
    }

    aiLog("llm_call", {
      provider: "gemini",
      model,
      purpose: "voice_transcribe",
      userId,
      input_tokens: data.usageMetadata?.promptTokenCount ?? null,
      output_tokens: data.usageMetadata?.candidatesTokenCount ?? null,
      cost_usd: estimateLlmCostUsd(
        model,
        data.usageMetadata?.promptTokenCount,
        data.usageMetadata?.candidatesTokenCount,
      ),
    });

    return (data.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
  }

  throw new LlmHttpError(lastError, lastStatus);
}
