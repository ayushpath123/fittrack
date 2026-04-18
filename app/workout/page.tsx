import { prisma } from "@/lib/prisma";
import { endOfDay, startOfDay } from "@/lib/date";
import { WorkoutClient } from "./WorkoutClient";
import { WorkoutType } from "@/types";
import { requireUserId } from "@/lib/auth";
import { toLocalDateKey } from "@/lib/date";
import { buildExerciseLastHints } from "@/lib/workoutHints";

export default async function WorkoutPage() {
  const userId = await requireUserId();
  const today = new Date();
  const todayKey = toLocalDateKey(today);
  const workout = await prisma.workout.findFirst({
    where: { userId, date: { gte: startOfDay(today), lte: endOfDay(today) } },
    include: { exercises: true },
  });
  const recent = await prisma.workout.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 5,
    include: { exercises: true },
  });
  const todayWorkout: WorkoutType | null = workout
    ? { ...workout, date: workout.date.toISOString() }
    : null;
  const recentWorkouts: WorkoutType[] = recent.map((item) => ({ ...item, date: item.date.toISOString() }));
  const exerciseHints = buildExerciseLastHints(recentWorkouts, todayKey);
  return <WorkoutClient todayWorkout={todayWorkout} recentWorkouts={recentWorkouts} exerciseHints={exerciseHints} />;
}
