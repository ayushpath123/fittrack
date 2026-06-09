import { AI_CONFIG } from "@/lib/ai/config";
import { estimateLlmCostUsd } from "@/lib/ai/cost";
import { LlmHttpError } from "@/lib/ai/anthropic";
import { aiLog } from "@/lib/ai/log";

function geminiModelCandidates(): string[] {
  const configured = process.env.GEMINI_MODEL?.trim();
  return [
    ...(configured ? [configured] : []),
    AI_CONFIG.gemini.defaultModel,
    ...AI_CONFIG.gemini.fallbackModels,
  ].filter((model, index, arr) => model.length > 0 && arr.indexOf(model) === index);
}

export function extractJsonObject(text: string): unknown | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function geminiGenerateJson<T>(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  opts: { purpose: string; userId?: string; maxTokens?: number },
): Promise<T> {
  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: opts.maxTokens ?? 1200,
      responseMimeType: "application/json",
    },
  };

  let lastError = "Gemini request failed";
  let lastStatus = 502;

  for (const model of geminiModelCandidates()) {
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

    const data = parsed as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      error?: { message?: string };
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };

    if (!res.ok) {
      lastError = data.error?.message ?? `Gemini request failed (${res.status})`;
      lastStatus = res.status;
      if (res.status === 404 || res.status === 429 || res.status >= 500) continue;
      throw new LlmHttpError(lastError, res.status);
    }

    aiLog("llm_call", {
      provider: "gemini",
      model,
      purpose: opts.purpose,
      userId: opts.userId,
      input_tokens: data.usageMetadata?.promptTokenCount ?? null,
      output_tokens: data.usageMetadata?.candidatesTokenCount ?? null,
      cost_usd: estimateLlmCostUsd(
        model,
        data.usageMetadata?.promptTokenCount,
        data.usageMetadata?.candidatesTokenCount,
      ),
    });

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const json = extractJsonObject(rawText) ?? JSON.parse(rawText);
    return json as T;
  }

  throw new LlmHttpError(lastError, lastStatus);
}
