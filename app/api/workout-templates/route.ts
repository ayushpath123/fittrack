import { NextRequest, NextResponse } from "next/server";
import { requireUserIdFromRequest } from "@/lib/auth";
import { createWorkoutTemplate, listWorkoutTemplates } from "@/lib/domain/workout-logs";
import { ensureDefaultWorkoutTemplates } from "@/lib/default-workout-templates";
import { workoutTemplatePayloadSchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
  const userId = await requireUserIdFromRequest(req);
  await ensureDefaultWorkoutTemplates(userId);
  const templates = await listWorkoutTemplates(userId);
  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const userId = await requireUserIdFromRequest(req);
  const parsed = workoutTemplatePayloadSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid template payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const template = await createWorkoutTemplate({ userId, ...parsed.data });
  return NextResponse.json(template);
}
