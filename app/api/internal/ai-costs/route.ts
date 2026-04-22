import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";

export async function GET(req: NextRequest) {
  try {
    await requireAdminUser();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 401 });
  }

  const range = req.nextUrl.searchParams.get("range") ?? "30d";
  const days = range === "7d" ? 7 : 30;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const logs = await prisma.llmCallLog.findMany({
    where: { event: "llm_call", createdAt: { gte: since } },
    select: { userId: true, purpose: true, provider: true, model: true, inputTokens: true, outputTokens: true, costUsd: true },
  });

  const totalCostUsd = logs.reduce((s, x) => s + (x.costUsd ?? 0), 0);
  const uniqueUsers = new Set(logs.map((x) => x.userId).filter(Boolean)).size;
  const byPurpose = Object.entries(
    logs.reduce<Record<string, { calls: number; costUsd: number }>>((acc, row) => {
      const keyPurpose = row.purpose ?? "unknown";
      acc[keyPurpose] = acc[keyPurpose] ?? { calls: 0, costUsd: 0 };
      acc[keyPurpose].calls += 1;
      acc[keyPurpose].costUsd += row.costUsd ?? 0;
      return acc;
    }, {}),
  ).map(([purpose, v]) => ({ purpose, ...v }));

  return NextResponse.json({
    range,
    totalCalls: logs.length,
    totalCostUsd: Number(totalCostUsd.toFixed(6)),
    uniqueUsers,
    avgCostPerActiveUserUsd: uniqueUsers > 0 ? Number((totalCostUsd / uniqueUsers).toFixed(6)) : 0,
    byPurpose,
  });
}
