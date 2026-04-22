const TOKEN_PRICE_PER_MILLION_USD: Record<string, { input: number; output: number }> = {
  "gemini-2.0-flash": { input: 0.1, output: 0.4 },
  "gemini-1.5-flash": { input: 0.1, output: 0.4 },
  "gemini-1.5-pro": { input: 1.25, output: 5.0 },
  "claude-sonnet-4-20250514": { input: 3.0, output: 15.0 },
};

export function estimateLlmCostUsd(model: string, inputTokens?: number | null, outputTokens?: number | null): number | null {
  const pricing = TOKEN_PRICE_PER_MILLION_USD[model];
  if (!pricing) return null;
  const inTok = typeof inputTokens === "number" ? Math.max(0, inputTokens) : 0;
  const outTok = typeof outputTokens === "number" ? Math.max(0, outputTokens) : 0;
  const cost = (inTok / 1_000_000) * pricing.input + (outTok / 1_000_000) * pricing.output;
  return Number.isFinite(cost) ? Number(cost.toFixed(8)) : null;
}
