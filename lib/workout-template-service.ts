import { endOfDay, startOfDay } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { createWorkoutLog, serializeWorkoutLog } from "@/lib/domain/workout-logs";
import type { WorkoutLogType } from "@/types/workout";
import type {
  TemplateExercise,
  WorkoutTemplateInput,
  WorkoutTemplateType,
  WorkoutTypeKind,
} from "@/types/workout";

type TemplateRow = {
  id: string;
  name: string;
  workoutType: string;
  description: string | null;
  icon: string | null;
  colorTheme: string | null;
  intensityLevel: string | null;
  category: string;
  duration: number;
  caloriesBurned: number;
  exercises: unknown;
  cardioType: string | null;
  cardioDistance: number | null;
  cardioPace: string | null;
  heartRate: number | null;
  builtinKey: string | null;
  useCount: number;
  lastUsedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

function parseExercises(raw: unknown): TemplateExercise[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (e): e is TemplateExercise =>
      !!e &&
      typeof e === "object" &&
      typeof (e as TemplateExercise).exerciseName === "string" &&
      typeof (e as TemplateExercise).sets === "number",
  );
}

export function toWorkoutTemplate(row: TemplateRow): WorkoutTemplateType {
  return {
    id: row.id,
    name: row.name,
    workoutType: row.workoutType as WorkoutTypeKind,
    description: row.description,
    icon: row.icon,
    colorTheme: row.colorTheme,
    intensityLevel: row.intensityLevel as WorkoutTemplateType["intensityLevel"],
    category: (row.category === "cardio" ? "cardio" : "strength") as WorkoutTemplateType["category"],
    duration: row.duration,
    caloriesBurned: row.caloriesBurned,
    exercises: parseExercises(row.exercises),
    cardioType: row.cardioType as WorkoutTemplateType["cardioType"],
    cardioDistance: row.cardioDistance,
    cardioPace: row.cardioPace,
    heartRate: row.heartRate,
    builtinKey: row.builtinKey,
    useCount: row.useCount,
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    createdAt: row.createdAt?.toISOString(),
    updatedAt: row.updatedAt?.toISOString(),
  };
}

function templateData(input: WorkoutTemplateInput) {
  return {
    name: input.name.trim(),
    workoutType: input.workoutType,
    description: input.description?.trim() || null,
    icon: input.icon || null,
    colorTheme: input.colorTheme || input.workoutType,
    intensityLevel: input.intensityLevel || "medium",
    category: input.category ?? (input.workoutType === "cardio" ? "cardio" : "strength"),
    duration: input.duration,
    caloriesBurned: input.caloriesBurned,
    exercises: (input.exercises ?? []) as object,
    cardioType: input.cardioType ?? null,
    cardioDistance: input.cardioDistance ?? null,
    cardioPace: input.cardioPace ?? null,
    heartRate: input.heartRate ?? null,
  };
}

export async function listWorkoutTemplatesForUser(userId: string, category?: string): Promise<WorkoutTemplateType[]> {
  const rows = await prisma.workoutTemplate.findMany({
    where: {
      userId,
      ...(category ? { category } : {}),
    },
    orderBy: [{ useCount: "desc" }, { updatedAt: "desc" }],
  });
  return rows.map(toWorkoutTemplate);
}

export async function getWorkoutTemplate(userId: string, id: string): Promise<WorkoutTemplateType | null> {
  const row = await prisma.workoutTemplate.findFirst({ where: { id, userId } });
  return row ? toWorkoutTemplate(row) : null;
}

export async function createWorkoutTemplateForUser(userId: string, input: WorkoutTemplateInput): Promise<WorkoutTemplateType> {
  const row = await prisma.workoutTemplate.create({
    data: { userId, ...templateData(input) },
  });
  return toWorkoutTemplate(row);
}

export async function updateWorkoutTemplateForUser(
  userId: string,
  id: string,
  input: WorkoutTemplateInput,
): Promise<WorkoutTemplateType | null> {
  const existing = await prisma.workoutTemplate.findFirst({ where: { id, userId } });
  if (!existing) return null;
  const row = await prisma.workoutTemplate.update({
    where: { id },
    data: templateData(input),
  });
  return toWorkoutTemplate(row);
}

export async function deleteWorkoutTemplateForUser(userId: string, id: string): Promise<boolean> {
  const existing = await prisma.workoutTemplate.findFirst({ where: { id, userId } });
  if (!existing) return false;
  await prisma.workoutTemplate.delete({ where: { id } });
  return true;
}

export type LogFromTemplateResult = {
  log: WorkoutLogType;
  duplicate: boolean;
};

async function findTodayLogForTemplate(userId: string, templateId: string, workoutDate?: string) {
  const day = workoutDate ? new Date(workoutDate) : new Date();
  return prisma.workoutLog.findFirst({
    where: {
      userId,
      templateId,
      workoutDate: { gte: startOfDay(day), lte: endOfDay(day) },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function logWorkoutFromTemplate(
  userId: string,
  templateId: string,
  options: {
    workoutDate?: string;
    duration?: number;
    caloriesBurned?: number;
    notes?: string;
    allowDuplicate?: boolean;
  } = {},
): Promise<LogFromTemplateResult | null> {
  const template = await prisma.workoutTemplate.findFirst({ where: { id: templateId, userId } });
  if (!template) return null;

  if (!options.allowDuplicate) {
    const existing = await findTodayLogForTemplate(userId, templateId, options.workoutDate);
    if (existing) {
      return { log: serializeWorkoutLog(existing), duplicate: true };
    }
  }

  const exercises = parseExercises(template.exercises);
  const notes =
    options.notes ??
    (exercises.length
      ? exercises.map((e) => `${e.exerciseName}: ${e.sets}×${e.reps}`).join(", ")
      : template.cardioType
        ? `Cardio: ${template.cardioType}${template.cardioDistance ? ` · ${template.cardioDistance} km` : ""}`
        : undefined);

  const log = await createWorkoutLog({
    userId,
    workoutName: template.name,
    workoutType: template.workoutType as WorkoutTypeKind,
    duration: options.duration ?? template.duration,
    caloriesBurned: options.caloriesBurned ?? template.caloriesBurned,
    workoutDate: options.workoutDate,
    notes,
    templateId,
    exercises,
  });

  return { log, duplicate: false };
}

export type BatchLogItemResult = {
  templateId: string;
  log?: WorkoutLogType;
  duplicate?: boolean;
  error?: string;
};

export async function logWorkoutsFromTemplates(
  userId: string,
  templateIds: string[],
  options: { workoutDate?: string } = {},
): Promise<BatchLogItemResult[]> {
  const uniqueIds = [...new Set(templateIds)];
  const results: BatchLogItemResult[] = [];

  for (const templateId of uniqueIds) {
    const result = await logWorkoutFromTemplate(userId, templateId, {
      workoutDate: options.workoutDate,
    });
    if (!result) {
      results.push({ templateId, error: "Template not found." });
      continue;
    }
    results.push({
      templateId,
      log: result.log,
      duplicate: result.duplicate,
    });
  }

  return results;
}
