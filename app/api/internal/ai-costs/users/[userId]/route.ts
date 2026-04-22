import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";

type Aggregated = {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

function aggregateByPurpose(
  rows: Array<{ purpose: string | null; inputTokens: number | null; outputTokens: number | null; costUsd: number | null }>,
) {
  const map = rows.reduce<Record<string, Aggregated>>((acc, r) => {
    const key = r.purpose ?? "unknown";
    acc[key] = acc[key] ?? { calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 };
    acc[key].calls += 1;
    acc[key].inputTokens += r.inputTokens ?? 0;
    acc[key].outputTokens += r.outputTokens ?? 0;
    acc[key].costUsd += r.costUsd ?? 0;
    return acc;
  }, {});
  return Object.entries(map).map(([purpose, v]) => ({
    purpose,
    calls: v.calls,
    inputTokens: v.inputTokens,
    outputTokens: v.outputTokens,
    costUsd: Number(v.costUsd.toFixed(6)),
  }));
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    await requireAdminUser();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 401 });
  }

  const { userId } = await params;
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [todayRows, monthRows, recentRows] = await Promise.all([
    prisma.llmCallLog.findMany({
      where: { userId, event: "llm_call", createdAt: { gte: dayStart } },
      select: { purpose: true, inputTokens: true, outputTokens: true, costUsd: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.llmCallLog.findMany({
      where: { userId, event: "llm_call", createdAt: { gte: monthStart } },
      select: { purpose: true, inputTokens: true, outputTokens: true, costUsd: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.llmCallLog.findMany({
      where: { userId, event: "llm_call" },
      select: { createdAt: true, purpose: true, model: true, provider: true, inputTokens: true, outputTokens: true, costUsd: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  const todayCost = todayRows.reduce((s, r) => s + (r.costUsd ?? 0), 0);
  const monthCost = monthRows.reduce((s, r) => s + (r.costUsd ?? 0), 0);

  return NextResponse.json({
    userId,
    today: {
      calls: todayRows.length,
      costUsd: Number(todayCost.toFixed(6)),
      byPurpose: aggregateByPurpose(todayRows),
    },
    month: {
      calls: monthRows.length,
      costUsd: Number(monthCost.toFixed(6)),
      byPurpose: aggregateByPurpose(monthRows),
    },
    recentCalls: recentRows.map((r) => ({
      createdAt: r.createdAt,
      purpose: r.purpose ?? "unknown",
      provider: r.provider ?? "unknown",
      model: r.model ?? "unknown",
      inputTokens: r.inputTokens ?? 0,
      outputTokens: r.outputTokens ?? 0,
      costUsd: Number((r.costUsd ?? 0).toFixed(6)),
    })),
  });
}
