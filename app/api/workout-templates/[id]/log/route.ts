export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireUserIdFromRequest } from "@/lib/auth";
import { logWorkoutFromTemplate } from "@/lib/workout-template-service";
import { workoutTemplateLogSchema } from "@/lib/validators";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const userId = await requireUserIdFromRequest(req);
  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const parsed = workoutTemplateLogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  const result = await logWorkoutFromTemplate(userId, id, parsed.data);
  if (!result) {
    return NextResponse.json({ error: "Template not found or could not log workout." }, { status: 404 });
  }

  if (result.duplicate) {
    return NextResponse.json(
      { ...result.log, duplicate: true, message: "Already logged today." },
      { status: 409 },
    );
  }

  return NextResponse.json(result.log);
}
