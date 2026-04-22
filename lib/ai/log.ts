import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type AiLogMeta = Record<string, unknown> & {
  userId?: string;
  provider?: string;
  model?: string;
  purpose?: string;
  input_tokens?: number | null;
  output_tokens?: number | null;
  cost_usd?: number | null;
};

export function aiLog(event: string, meta: AiLogMeta = {}) {
  const line = JSON.stringify({ ts: new Date().toISOString(), event, ...meta });
  console.log(line);

  void prisma.llmCallLog
    .create({
      data: {
        event,
        userId: typeof meta.userId === "string" ? meta.userId : null,
        provider: typeof meta.provider === "string" ? meta.provider : null,
        model: typeof meta.model === "string" ? meta.model : null,
        purpose: typeof meta.purpose === "string" ? meta.purpose : null,
        inputTokens: typeof meta.input_tokens === "number" ? meta.input_tokens : null,
        outputTokens: typeof meta.output_tokens === "number" ? meta.output_tokens : null,
        costUsd: typeof meta.cost_usd === "number" ? meta.cost_usd : null,
        meta: meta as Prisma.InputJsonValue,
      },
    })
    .catch(() => {
      // Keep logging non-blocking even if DB write fails.
    });
}
