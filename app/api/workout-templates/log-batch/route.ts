export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireUserIdFromRequest } from "@/lib/auth";
import { logWorkoutsFromTemplates } from "@/lib/workout-template-service";
import { workoutTemplateBatchLogSchema } from "@/lib/validators";

export async function POST(req: NextRequest) {
  const userId = await requireUserIdFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const parsed = workoutTemplateBatchLogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  const results = await logWorkoutsFromTemplates(userId, parsed.data.templateIds, {
    workoutDate: parsed.data.workoutDate,
  });

  const logs = results.filter((r) => r.log).map((r) => r.log!);
  const skipped = results.filter((r) => r.duplicate).length;
  const failed = results.filter((r) => r.error).length;

  if (!logs.length && (skipped > 0 || failed > 0)) {
    return NextResponse.json(
      {
        error: skipped > 0 ? "These workouts were already logged today." : "Could not log workouts.",
        results,
      },
      { status: skipped > 0 && !failed ? 409 : 400 },
    );
  }

  return NextResponse.json({ logs, results, skipped, failed });
}
