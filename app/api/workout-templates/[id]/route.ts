export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireUserIdFromRequest } from "@/lib/auth";
import {
  deleteWorkoutTemplateForUser,
  getWorkoutTemplate,
  updateWorkoutTemplateForUser,
} from "@/lib/workout-template-service";
import { workoutTemplatePayloadSchema } from "@/lib/validators";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const userId = await requireUserIdFromRequest(req);
  const { id } = await context.params;
  const template = await getWorkoutTemplate(userId, id);
  if (!template) return NextResponse.json({ error: "Template not found." }, { status: 404 });
  return NextResponse.json(template);
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const userId = await requireUserIdFromRequest(req);
  const { id } = await context.params;
  const parsed = workoutTemplatePayloadSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const template = await updateWorkoutTemplateForUser(userId, id, parsed.data);
  if (!template) return NextResponse.json({ error: "Template not found." }, { status: 404 });
  return NextResponse.json(template);
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const userId = await requireUserIdFromRequest(req);
  const { id } = await context.params;
  const ok = await deleteWorkoutTemplateForUser(userId, id);
  if (!ok) return NextResponse.json({ error: "Template not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
