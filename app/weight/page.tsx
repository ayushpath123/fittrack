import { prisma } from "@/lib/prisma";
import { getDaysAgo } from "@/lib/date";
import { WeightClient } from "./WeightClient";
import { WeightLogType } from "@/types";
import { requireUserId } from "@/lib/auth";

export default async function WeightPage() {
  const userId = await requireUserId();
  const logs = await prisma.weightLog.findMany({ where: { userId, date: { gte: getDaysAgo(30) } }, orderBy: { date: "asc" } });
  const initialLogs: WeightLogType[] = logs.map((log) => ({
    id: log.id,
    date: log.date.toISOString(),
    weight: log.weight,
    waistCm: log.waistCm ?? undefined,
  }));
  return <WeightClient initialLogs={initialLogs} />;
}
