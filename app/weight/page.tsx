import { prisma } from "@/lib/prisma";
import { getDaysAgo } from "@/lib/date";
import { WeightClient } from "./WeightClient";
import { WeightLogType } from "@/types";
import { requireUserIdForPage } from "@/lib/auth";

export default async function WeightPage() {
  const userId = await requireUserIdForPage();
  const logs = await prisma.weightLog.findMany({ where: { userId, date: { gte: getDaysAgo(90) } }, orderBy: { date: "asc" } });
  const initialLogs: WeightLogType[] = logs.map((log) => ({
    id: log.id,
    date: log.date.toISOString(),
    weight: log.weight,
    waistCm: log.waistCm ?? undefined,
  }));
  return <WeightClient initialLogs={initialLogs} />;
}
