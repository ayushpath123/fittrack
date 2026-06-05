import { prisma } from "@/lib/prisma";
import { WeightClient } from "./WeightClient";
import { requireUserIdForPage } from "@/lib/auth";
import { serializeWeightLog } from "@/lib/weight-serialize";

export default async function WeightPage() {
  const userId = await requireUserIdForPage();
  const logs = await prisma.weightLog.findMany({
    where: { userId },
    orderBy: { date: "asc" },
  });
  return <WeightClient initialLogs={logs.map(serializeWeightLog)} />;
}
