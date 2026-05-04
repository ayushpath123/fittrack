import { aiLog } from "@/lib/ai/log";
import { AI_CONFIG } from "@/lib/ai/config";
import { estimateLlmCostUsd } from "@/lib/ai/cost";

type AnthropicMessageArgs = {
  system: string;
  user: string;
  maxTokens: number;
  model?: string;
  image?: { mediaType: string; dataBase64: string };
  purpose: string;
  userId?: string;
};

export class LlmHttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "LlmHttpError";
    this.status = status;
  }
}

const DEFAULT_MODEL = AI_CONFIG.anthropic.defaultModel;
const DEFAULT_GEMINI_MODEL = AI_CONFIG.gemini.defaultModel;
const GEMINI_FALLBACK_MODELS = AI_CONFIG.gemini.fallbackModels;

async function callGeminiJson(args: AnthropicMessageArgs): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Neither ANTHROPIC_API_KEY nor GEMINI_API_KEY is configured.");
  }

  const configuredModel = process.env.GEMINI_MODEL?.trim();
  const modelCandidates = [
    ...(configuredModel ? [configuredModel] : [DEFAULT_GEMINI_MODEL]),
    ...GEMINI_FALLBACK_MODELS,
  ].filter((m, i, arr) => m.length > 0 && arr.indexOf(m) === i);

  const parts = args.image
    ? [
        { text: `${args.system}\n\n${args.user}` },
        { inline_data: { mime_type: args.image.mediaType, data: args.image.dataBase64 } },
      ]
    : [{ text: `${args.system}\n\n${args.user}` }];

  let lastError = "Gemini request failed";
  for (const model of modelCandidates) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.2,
          topP: 0.9,
          maxOutputTokens: args.maxTokens,
        },
      }),
    });

    const raw = await res.text();
    if (!res.ok) {
      lastError = `Gemini request failed (${res.status})`;
      aiLog("gemini_error", {
        purpose: args.purpose,
        userId: args.userId,
        model,
        status: res.status,
        raw: raw.slice(0, 300),
      });
      // Retry with another model for transient/provider capacity issues.
      if (res.status === 404 || res.status === 429 || res.status >= 500) {
        continue;
      }
      throw new LlmHttpError(lastError, res.status);
    }

    const parsed = JSON.parse(raw) as {
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    aiLog("llm_call", {
      provider: "gemini",
      model,
      purpose: args.purpose,
      userId: args.userId,
      input_tokens: parsed.usageMetadata?.promptTokenCount ?? null,
      output_tokens: parsed.usageMetadata?.candidatesTokenCount ?? null,
      cost_usd: estimateLlmCostUsd(model, parsed.usageMetadata?.promptTokenCount, parsed.usageMetadata?.candidatesTokenCount),
    });

    const text = parsed.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("\n").trim() ?? "";
    if (!text) throw new Error("Gemini empty response.");
    return text;
  }

  const status = /\(429\)/.test(lastError) ? 429 : 502;
  throw new LlmHttpError(lastError, status);
}

export async function callAnthropicJson(args: AnthropicMessageArgs): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return callGeminiJson(args);
  }

  const model = args.model ?? DEFAULT_MODEL;
  const content = args.image
    ? [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: args.image.mediaType,
            data: args.image.dataBase64,
          },
        },
        { type: "text", text: args.user },
      ]
    : [{ type: "text", text: args.user }];

  const body = {
    model,
    max_tokens: args.maxTokens,
    system: args.system,
    messages: [{ role: "user", content }],
  };

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  const raw = await res.text();
  if (!res.ok) {
    aiLog("anthropic_error", { purpose: args.purpose, userId: args.userId, status: res.status, raw: raw.slice(0, 300) });
    throw new LlmHttpError(`Anthropic request failed (${res.status})`, res.status);
  }

  const parsed = JSON.parse(raw) as {
    id?: string;
    usage?: { input_tokens?: number; output_tokens?: number };
    content?: Array<{ type?: string; text?: string }>;
  };

  aiLog("llm_call", {
    provider: "anthropic",
    model,
    purpose: args.purpose,
    userId: args.userId,
    input_tokens: parsed.usage?.input_tokens ?? null,
    output_tokens: parsed.usage?.output_tokens ?? null,
    cost_usd: estimateLlmCostUsd(model, parsed.usage?.input_tokens, parsed.usage?.output_tokens),
  });

  const text = parsed.content?.find((c) => c.type === "text")?.text ?? "";
  if (!text) throw new Error("Anthropic empty response.");
  return text;
}
