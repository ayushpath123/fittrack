import { z } from "zod";

export const barcodeImportSchema = z.object({
  code: z.string().min(8).max(32),
  save: z.boolean().optional(),
});

export const mealItemSchema = z.object({
  foodId: z.string().min(1),
  grams: z.number().positive().optional(),
  multiplier: z.number().positive().optional(),
});

export const mealPayloadSchema = z.object({
  date: z.string().min(1),
  mealType: z.string().min(1),
  items: z.array(mealItemSchema).default([]),
  estimateId: z.string().min(1).optional(),
});

export const aiEstimateUpdateSchema = z.object({
  calories: z.number().nonnegative().optional(),
  protein: z.number().nonnegative().optional(),
  carbs: z.number().nonnegative().optional(),
  fat: z.number().nonnegative().optional(),
  confidence: z.number().min(0).max(1).optional(),
  status: z.enum(["draft", "confirmed", "used", "rejected"]).optional(),
}).refine((d) => Object.keys(d).length > 0, { message: "No estimate fields to update" });

export const workoutExerciseSchema = z.object({
  name: z.string().min(1),
  sets: z.number().int().positive(),
  reps: z.number().int().positive(),
  weight: z.number().nonnegative(),
});

export const workoutPayloadSchema = z.object({
  date: z.string().min(1),
  exercises: z.array(workoutExerciseSchema).min(1),
});

export const weightPayloadSchema = z.object({
  date: z.string().min(1),
  weight: z.number().positive(),
  waistCm: z.number().positive().optional(),
});

export const weightPatchSchema = z
  .object({
    weight: z.number().positive().optional(),
    waistCm: z.union([z.number().positive(), z.null()]).optional(),
  })
  .refine((d) => d.weight !== undefined || d.waistCm !== undefined, { message: "No fields to update" });

export const goalsPayloadSchema = z.object({
  calorieTarget: z.number().int().positive(),
  proteinTarget: z.number().int().positive(),
  carbTarget: z.number().int().positive().optional(),
  fatTarget: z.number().int().positive().optional(),
  waterTargetMl: z.number().int().positive().max(20000).optional(),
  reminderEnabled: z.boolean().optional(),
  reminderTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm (24h)")
    .optional(),
});

const isoOrDateString = z.union([
  z.string().min(1),
  z.coerce.date().transform((d) => d.toISOString()),
]);

export const backupMealRowSchema = z.object({
  date: isoOrDateString,
  mealType: z.string().min(1),
  items: z.array(mealItemSchema).min(1),
});

export const backupWorkoutRowSchema = z.object({
  date: isoOrDateString,
  completed: z.boolean().optional(),
  exercises: z.array(workoutExerciseSchema).min(1),
});

export const backupWeightRowSchema = z.object({
  date: isoOrDateString,
  weight: z.number().positive(),
  waistCm: z.union([z.number(), z.null()]).optional(),
});

export const backupHydrationRowSchema = z.object({
  date: isoOrDateString,
  totalMl: z.number().int().nonnegative(),
});

export const backupDocumentSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string().optional(),
  meals: z.array(z.unknown()),
  workouts: z.array(z.unknown()),
  weightLogs: z.array(z.unknown()),
  goals: z.unknown().optional(),
  hydrationLogs: z.array(z.unknown()).optional(),
});

export const importRequestSchema = z.object({
  mode: z.enum(["replace", "merge"]),
  backup: backupDocumentSchema,
});

export const hydrationPostSchema = z.object({
  addMl: z.number().int().positive().max(10000),
  date: z.string().min(1).optional(),
});

export const analyticsRangeSchema = z.enum(["7d", "30d", "90d"]).default("30d");

export const analyticsQuerySchema = z.object({
  range: analyticsRangeSchema,
});
