import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateMealTotals } from "@/lib/calculations";
import { startOfDay } from "@/lib/date";
import type { FoodItemType, MealItem } from "@/types";
import {
  backupHydrationRowSchema,
  backupMealRowSchema,
  backupWeightRowSchema,
  backupWorkoutRowSchema,
} from "@/lib/validators";
import type { z } from "zod";

type BackupMeal = z.infer<typeof backupMealRowSchema>;
type BackupWorkout = z.infer<typeof backupWorkoutRowSchema>;
type BackupWeight = z.infer<typeof backupWeightRowSchema>;
type BackupHydration = z.infer<typeof backupHydrationRowSchema>;

const goalsPartialSchema = {
  calorieTarget: (v: unknown) => (typeof v === "number" && v > 0 ? Math.round(v) : undefined),
  proteinTarget: (v: unknown) => (typeof v === "number" && v > 0 ? Math.round(v) : undefined),
  carbTarget: (v: unknown) => (typeof v === "number" && v >= 0 ? Math.round(v) : undefined),
  fatTarget: (v: unknown) => (typeof v === "number" && v >= 0 ? Math.round(v) : undefined),
  waterTargetMl: (v: unknown) => (typeof v === "number" && v > 0 ? Math.round(v) : undefined),
  reminderEnabled: (v: unknown) => (typeof v === "boolean" ? v : undefined),
  reminderTime: (v: unknown) => (typeof v === "string" ? v : undefined),
} as const;

function mealDateWithCurrentTime(dateInput: string): Date {
  const mealDate = new Date(dateInput);
  const now = new Date();
  mealDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
  return mealDate;
}

function parseRows<T>(
  label: string,
  arr: unknown[],
  schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false } },
): { ok: true; rows: T[] } | { ok: false; message: string } {
  const rows: T[] = [];
  for (let i = 0; i < arr.length; i++) {
    const r = schema.safeParse(arr[i]);
    if (!r.success) {
      return { ok: false, message: `Invalid ${label} at index ${i}` };
    }
    rows.push(r.data);
  }
  return { ok: true, rows };
}

export async function executeBackupImport(
  userId: string,
  mode: "replace" | "merge",
  backup: {
    version: 1;
    meals: unknown[];
    workouts: unknown[];
    weightLogs: unknown[];
    hydrationLogs?: unknown[];
    goals?: unknown;
  },
): Promise<
  | {
      ok: true;
      mealsCreated: number;
      workoutsCreated: number;
      weightUpserted: number;
      hydrationUpserted: number;
      goalsUpdated: boolean;
    }
  | { ok: false; message: string }
> {
  const mealsParsed = parseRows<BackupMeal>("meal", backup.meals, backupMealRowSchema);
  if (!mealsParsed.ok) return { ok: false, message: mealsParsed.message };
  const workoutsParsed = parseRows<BackupWorkout>("workout", backup.workouts, backupWorkoutRowSchema);
  if (!workoutsParsed.ok) return { ok: false, message: workoutsParsed.message };
  const weightsParsed = parseRows<BackupWeight>("weight log", backup.weightLogs, backupWeightRowSchema);
  if (!weightsParsed.ok) return { ok: false, message: weightsParsed.message };

  const hydrationRaw = backup.hydrationLogs ?? [];
  const hydrationParsed = parseRows<BackupHydration>("hydration", hydrationRaw, backupHydrationRowSchema);
  if (!hydrationParsed.ok) return { ok: false, message: hydrationParsed.message };

  const allFoodIds = new Set<string>();
  for (const m of mealsParsed.rows) {
    for (const it of m.items) allFoodIds.add(it.foodId);
  }
  const foods = await prisma.foodItem.findMany({ where: { id: { in: [...allFoodIds] } } });
  if (foods.length !== allFoodIds.size) {
    const have = new Set(foods.map((f) => f.id));
    const missing = [...allFoodIds].filter((id) => !have.has(id));
    return {
      ok: false,
      message: `Unknown food id(s) in backup (same database foods required): ${missing.slice(0, 8).join(", ")}${missing.length > 8 ? "…" : ""}`,
    };
  }
  const foodsTyped = foods as unknown as FoodItemType[];

  const result = await prisma.$transaction(async (tx) => {
    let goalsUpdated = false;

    if (mode === "replace") {
      await tx.exerciseEntry.deleteMany({ where: { workout: { userId } } });
      await tx.workout.deleteMany({ where: { userId } });
      await tx.mealEntry.deleteMany({ where: { userId } });
      await tx.weightLog.deleteMany({ where: { userId } });
      await tx.hydrationLog.deleteMany({ where: { userId } });

      const g = backup.goals && typeof backup.goals === "object" ? (backup.goals as Record<string, unknown>) : null;
      if (g) {
        const update: Record<string, unknown> = {};
        for (const [key, fn] of Object.entries(goalsPartialSchema)) {
          const v = fn(g[key]);
          if (v !== undefined) (update as Record<string, number | boolean | string>)[key] = v as never;
        }
        if (Object.keys(update).length > 0) {
          await tx.goalSetting.upsert({
            where: { userId },
            update,
            create: {
              userId,
              calorieTarget: (update.calorieTarget as number | undefined) ?? 1500,
              proteinTarget: (update.proteinTarget as number | undefined) ?? 110,
              carbTarget: (update.carbTarget as number | undefined) ?? 180,
              fatTarget: (update.fatTarget as number | undefined) ?? 55,
              waterTargetMl: (update.waterTargetMl as number | undefined) ?? 2000,
              reminderEnabled: (update.reminderEnabled as boolean | undefined) ?? false,
              reminderTime: (update.reminderTime as string | undefined) ?? "09:00",
            },
          });
          goalsUpdated = true;
        }
      }
    }

    let mealsCreated = 0;
    for (const m of mealsParsed.rows) {
      const items = m.items as MealItem[];
      const { totalCalories, totalProtein, totalCarbs, totalFat } = calculateMealTotals(foodsTyped, items);
      await tx.mealEntry.create({
        data: {
          userId,
          date: mealDateWithCurrentTime(m.date),
          mealType: m.mealType,
          items: items as unknown as Prisma.JsonArray,
          totalCalories,
          totalProtein,
          totalCarbs,
          totalFat,
        },
      });
      mealsCreated++;
    }

    let workoutsCreated = 0;
    for (const w of workoutsParsed.rows) {
      const day = startOfDay(new Date(w.date));
      await tx.workout.create({
        data: {
          userId,
          date: day,
          completed: w.completed ?? false,
          exercises: {
            create: w.exercises.map(({ name, sets, reps, weight }) => ({ name, sets, reps, weight })),
          },
        },
      });
      workoutsCreated++;
    }

    let weightUpserted = 0;
    for (const wl of weightsParsed.rows) {
      const d = startOfDay(new Date(wl.date));
      await tx.weightLog.upsert({
        where: { userId_date: { userId, date: d } },
        update: {
          weight: wl.weight,
          ...(wl.waistCm !== undefined ? { waistCm: wl.waistCm } : {}),
        },
        create: {
          userId,
          date: d,
          weight: wl.weight,
          ...(wl.waistCm !== undefined ? { waistCm: wl.waistCm } : {}),
        },
      });
      weightUpserted++;
    }

    let hydrationUpserted = 0;
    for (const h of hydrationParsed.rows) {
      const d = startOfDay(new Date(h.date));
      await tx.hydrationLog.upsert({
        where: { userId_date: { userId, date: d } },
        update: { totalMl: h.totalMl },
        create: { userId, date: d, totalMl: h.totalMl },
      });
      hydrationUpserted++;
    }

    return { mealsCreated, workoutsCreated, weightUpserted, hydrationUpserted, goalsUpdated };
  });

  return { ok: true, ...result };
}
