import { prisma } from "@/lib/prisma";
import { endOfDay, startOfDay, toLocalDateKey } from "@/lib/date";
import type { CorrectionAction } from "@/lib/voice/types";

export type CorrectionResult = {
  success: boolean;
  message: string;
  affected?: string[];
};

export async function applyCorrection(
  userId: string,
  action: CorrectionAction,
  date?: string,
): Promise<CorrectionResult> {
  const today = date ?? toLocalDateKey(new Date());
  const dayStart = startOfDay(new Date(today));
  const dayEnd = endOfDay(new Date(today));

  if (action.type === "update_hydration") {
    const row = await prisma.hydrationLog.upsert({
      where: { userId_date: { userId, date: dayStart } },
      update: { totalMl: action.amountMl },
      create: { userId, date: dayStart, totalMl: action.amountMl },
    });
    return {
      success: true,
      message: `Water updated to ${row.totalMl} ml`,
      affected: [row.id],
    };
  }

  const target = action.targetLabel.toLowerCase();

  if (action.type === "remove") {
    const [meals, workouts] = await Promise.all([
      prisma.mealEntry.findMany({
        where: { userId, date: { gte: dayStart, lte: dayEnd } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.workoutLog.findMany({
        where: { userId, workoutDate: { gte: dayStart, lte: dayEnd } },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const mealMatch = meals.find((m) => {
      const items = m.items as Array<{ kind?: string; name?: string }>;
      return items.some((i) => i.name?.toLowerCase().includes(target));
    });

    if (mealMatch) {
      await prisma.mealEntry.delete({ where: { id: mealMatch.id } });
      return { success: true, message: `Removed meal log`, affected: [mealMatch.id] };
    }

    const workoutMatch = workouts.find((w) => w.workoutName.toLowerCase().includes(target));
    if (workoutMatch) {
      await prisma.workoutLog.delete({ where: { id: workoutMatch.id } });
      return { success: true, message: `Removed workout log`, affected: [workoutMatch.id] };
    }

    return { success: false, message: `No log found matching "${action.targetLabel}" today` };
  }

  if (action.type === "replace") {
    const meals = await prisma.mealEntry.findMany({
      where: { userId, date: { gte: dayStart, lte: dayEnd } },
      orderBy: { createdAt: "desc" },
    });

    const mealMatch = meals.find((m) => {
      const items = m.items as Array<{ kind?: string; name?: string }>;
      return items.some((i) => i.name?.toLowerCase().includes(target));
    });

    if (mealMatch) {
      await prisma.mealEntry.delete({ where: { id: mealMatch.id } });
      return {
        success: true,
        message: `Removed "${action.targetLabel}". Log "${action.replacement}" separately.`,
        affected: [mealMatch.id],
      };
    }

    return { success: false, message: `No log found to replace` };
  }

  return { success: false, message: "Unknown correction type" };
}
