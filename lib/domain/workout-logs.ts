import { prisma } from "@/lib/prisma";
import { endOfDay, getDaysAgo, startOfDay } from "@/lib/date";
import { toWorkoutTemplate } from "@/lib/workout-template-service";
import type {
  TemplateExercise,
  WorkoutDaySummary,
  WorkoutLogType,
  WorkoutTemplateType,
  WorkoutTypeKind,
} from "@/types/workout";

function parseExercises(raw: unknown): TemplateExercise[] | undefined {
  if (!Array.isArray(raw) || !raw.length) return undefined;
  return raw as TemplateExercise[];
}

export function serializeWorkoutLog(row: {
  id: string;
  userId: string;
  workoutName: string;
  workoutType: string;
  duration: number;
  caloriesBurned: number;
  workoutDate: Date;
  notes: string | null;
  templateId?: string | null;
  exercises?: unknown;
  createdAt: Date;
  updatedAt?: Date;
}): WorkoutLogType {
  return {
    id: row.id,
    userId: row.userId,
    workoutName: row.workoutName,
    workoutType: row.workoutType as WorkoutTypeKind,
    duration: row.duration,
    caloriesBurned: row.caloriesBurned,
    workoutDate: row.workoutDate.toISOString(),
    notes: row.notes,
    templateId: row.templateId ?? null,
    exercises: parseExercises(row.exercises),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt?.toISOString(),
  };
}

export async function listWorkoutLogsForDate(userId: string, dateStr?: string): Promise<WorkoutLogType[]> {
  const normalizedDate = dateStr ?? new Date().toISOString().split("T")[0];
  const date = new Date(normalizedDate);
  const rows = await prisma.workoutLog.findMany({
    where: { userId, workoutDate: { gte: startOfDay(date), lte: endOfDay(date) } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(serializeWorkoutLog);
}

export async function listWorkoutLogHistory(userId: string, limit = 50): Promise<WorkoutLogType[]> {
  const rows = await prisma.workoutLog.findMany({
    where: { userId },
    orderBy: { workoutDate: "desc" },
    take: limit,
  });
  return rows.map(serializeWorkoutLog);
}

export async function createWorkoutLog(params: {
  userId: string;
  workoutName: string;
  workoutType: WorkoutTypeKind;
  duration: number;
  caloriesBurned: number;
  workoutDate?: string;
  notes?: string;
  templateId?: string;
  exercises?: TemplateExercise[];
}): Promise<WorkoutLogType> {
  const { userId, workoutName, workoutType, duration, caloriesBurned, notes, templateId, exercises } = params;
  const day = params.workoutDate ? new Date(params.workoutDate) : new Date();
  const now = new Date();
  const workoutDate = new Date(day);
  workoutDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

  const row = await prisma.workoutLog.create({
    data: {
      userId,
      workoutName: workoutName.trim(),
      workoutType,
      duration,
      caloriesBurned,
      workoutDate,
      notes: notes?.trim() || null,
      templateId: templateId ?? null,
      exercises: exercises?.length ? (exercises as object) : undefined,
    },
  });

  if (templateId) {
    await prisma.workoutTemplate.updateMany({
      where: { id: templateId, userId },
      data: { useCount: { increment: 1 }, lastUsedAt: new Date() },
    });
  }

  return serializeWorkoutLog(row);
}

export async function updateWorkoutLog(
  userId: string,
  id: string,
  fields: {
    workoutName?: string;
    workoutType?: WorkoutTypeKind;
    duration?: number;
    caloriesBurned?: number;
    notes?: string | null;
  },
): Promise<WorkoutLogType | null> {
  const updated = await prisma.workoutLog.updateMany({
    where: { id, userId },
    data: {
      ...(fields.workoutName !== undefined ? { workoutName: fields.workoutName.trim() } : {}),
      ...(fields.workoutType !== undefined ? { workoutType: fields.workoutType } : {}),
      ...(fields.duration !== undefined ? { duration: fields.duration } : {}),
      ...(fields.caloriesBurned !== undefined ? { caloriesBurned: fields.caloriesBurned } : {}),
      ...(fields.notes !== undefined ? { notes: fields.notes?.trim() || null } : {}),
    },
  });
  if (!updated.count) return null;
  const row = await prisma.workoutLog.findFirst({ where: { id, userId } });
  return row ? serializeWorkoutLog(row) : null;
}

export async function deleteWorkoutLog(userId: string, id: string): Promise<boolean> {
  const deleted = await prisma.workoutLog.deleteMany({ where: { id, userId } });
  return deleted.count > 0;
}

export function summarizeWorkoutLogs(logs: { duration: number; caloriesBurned: number }[]): WorkoutDaySummary {
  return {
    workoutCount: logs.length,
    totalCaloriesBurned: logs.reduce((s, l) => s + l.caloriesBurned, 0),
    totalDurationMin: logs.reduce((s, l) => s + l.duration, 0),
  };
}

export async function getWorkoutSummaryForDate(userId: string, dateStr?: string): Promise<WorkoutDaySummary> {
  const logs = await listWorkoutLogsForDate(userId, dateStr);
  return summarizeWorkoutLogs(logs);
}

export async function getWorkoutSummaryForWeek(userId: string): Promise<WorkoutDaySummary> {
  const weekStart = getDaysAgo(6);
  const today = new Date();
  const rows = await prisma.workoutLog.findMany({
    where: { userId, workoutDate: { gte: startOfDay(weekStart), lte: endOfDay(today) } },
    select: { duration: true, caloriesBurned: true },
  });
  return summarizeWorkoutLogs(rows);
}

export async function listWorkoutTemplates(userId: string): Promise<WorkoutTemplateType[]> {
  const rows = await prisma.workoutTemplate.findMany({
    where: { userId },
    orderBy: [{ useCount: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(toWorkoutTemplate);
}

/** @deprecated Use createWorkoutTemplateForUser from workout-template-service */
export async function createWorkoutTemplate(params: {
  userId: string;
  name: string;
  workoutType: WorkoutTypeKind;
  duration: number;
  caloriesBurned: number;
}): Promise<WorkoutTemplateType> {
  const row = await prisma.workoutTemplate.create({
    data: {
      userId: params.userId,
      name: params.name.trim(),
      workoutType: params.workoutType,
      duration: params.duration,
      caloriesBurned: params.caloriesBurned,
      exercises: [],
    },
  });
  return toWorkoutTemplate(row);
}
