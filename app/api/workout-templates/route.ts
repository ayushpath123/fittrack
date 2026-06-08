import { NextRequest, NextResponse } from "next/server";
import { requireUserIdFromRequest } from "@/lib/auth";
import { ensureDefaultWorkoutTemplates } from "@/lib/default-workout-templates";
import { createWorkoutTemplateForUser, listWorkoutTemplatesForUser } from "@/lib/workout-template-service";
import { workoutTemplatePayloadSchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
  const userId = await requireUserIdFromRequest(req);
  await ensureDefaultWorkoutTemplates(userId);
  const category = req.nextUrl.searchParams.get("category") ?? undefined;
  const templates = await listWorkoutTemplatesForUser(userId, category ?? undefined);
  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const userId = await requireUserIdFromRequest(req);
  const parsed = workoutTemplatePayloadSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid template payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const template = await createWorkoutTemplateForUser(userId, parsed.data);
  return NextResponse.json(template);
}
