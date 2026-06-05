import { prisma } from "@/lib/prisma";
import type { WorkoutTypeKind } from "@/types/workout";

const DEFAULT_TEMPLATES: {
  name: string;
  workoutType: WorkoutTypeKind;
  duration: number;
  caloriesBurned: number;
}[] = [
  { name: "Chest Day", workoutType: "chest", duration: 45, caloriesBurned: 300 },
  { name: "Morning Walk", workoutType: "cardio", duration: 30, caloriesBurned: 150 },
  { name: "Football Practice", workoutType: "sports", duration: 60, caloriesBurned: 500 },
];

export async function ensureDefaultWorkoutTemplates(userId: string): Promise<void> {
  const count = await prisma.workoutTemplate.count({ where: { userId } });
  if (count > 0) return;

  await prisma.workoutTemplate.createMany({
    data: DEFAULT_TEMPLATES.map((t) => ({ userId, ...t })),
  });
}
