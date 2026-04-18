import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { endOfDay, startOfDay } from "@/lib/date";
import { ExerciseEntryType } from "@/types";
import { requireUserId } from "@/lib/auth";
import { workoutPayloadSchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
  const userId = await requireUserId();
  const dateStr = req.nextUrl.searchParams.get("date") ?? new Date().toISOString().split("T")[0];
  const date = new Date(dateStr);
  const workout = await prisma.workout.findFirst({
    where: { userId, date: { gte: startOfDay(date), lte: endOfDay(date) } },
    orderBy: { date: "desc" },
    include: { exercises: true },
  });
  return NextResponse.json(workout);
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  const parsed = workoutPayloadSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid workout payload", details: parsed.error.flatten() }, { status: 400 });
  }
  const { date, exercises } = parsed.data as { date: string; exercises: ExerciseEntryType[] };
  const day = new Date(date);
  const existing = await prisma.workout.findFirst({
    where: { userId, date: { gte: startOfDay(day), lte: endOfDay(day) } },
  });

  const workout = existing
    ? await prisma.workout.update({
        where: { id: existing.id },
        data: {
          exercises: {
            deleteMany: {},
            create: exercises.map(({ name, sets, reps, weight }) => ({ name, sets, reps, weight })),
          },
        },
        include: { exercises: true },
      })
    : await prisma.workout.create({
        data: {
          userId,
          date: startOfDay(day),
          exercises: { create: exercises.map(({ name, sets, reps, weight }) => ({ name, sets, reps, weight })) },
        },
        include: { exercises: true },
      });
  return NextResponse.json(workout);
}
