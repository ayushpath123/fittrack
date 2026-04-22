import { prisma } from "@/lib/prisma";
import { startOfDay } from "@/lib/date";

export async function countAiCallsSince(userId: string, purpose: string, since: Date): Promise<number> {
  return prisma.llmCallLog.count({
    where: {
      userId,
      event: "llm_call",
      purpose,
      createdAt: { gte: since },
    },
  });
}

export async function enforceAiBudget(args: {
  userId: string;
  purpose: string;
  maxPerDay?: number;
  maxPerMonth?: number;
}): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  const { userId, purpose, maxPerDay, maxPerMonth } = args;

  if (typeof maxPerDay === "number") {
    const dayCount = await countAiCallsSince(userId, purpose, startOfDay(new Date()));
    if (dayCount >= maxPerDay) {
      return { ok: false, code: "AI_BUDGET_DAILY", message: "Daily AI usage limit reached for this feature." };
    }
  }

  if (typeof maxPerMonth === "number") {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthCount = await countAiCallsSince(userId, purpose, monthStart);
    if (monthCount >= maxPerMonth) {
      return { ok: false, code: "AI_BUDGET_MONTHLY", message: "Monthly AI usage limit reached for this feature." };
    }
  }

  return { ok: true };
}
