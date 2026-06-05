import { WEIGHT_UNIT } from "@/lib/weight-analytics";
import type { WeightLogType } from "@/types";

type PrismaWeightLog = {
  id: string;
  userId: string;
  date: Date;
  weight: number;
  waistCm?: number | null;
  createdAt: Date;
  updatedAt?: Date;
};

export function serializeWeightLog(log: PrismaWeightLog): WeightLogType {
  const when = log.updatedAt ?? log.createdAt ?? log.date;
  const loggedAt =
    when instanceof Date
      ? when.toISOString()
      : when
        ? new Date(when).toISOString()
        : new Date().toISOString();
  const createdAt =
    log.createdAt instanceof Date
      ? log.createdAt.toISOString()
      : log.createdAt
        ? new Date(log.createdAt).toISOString()
        : loggedAt;

  return {
    id: log.id,
    userId: log.userId,
    weight: log.weight,
    unit: WEIGHT_UNIT,
    date: loggedAt,
    loggedAt,
    createdAt,
    waistCm: log.waistCm ?? undefined,
  };
}
