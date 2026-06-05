export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireUserIdFromRequest, StaleSessionError } from "@/lib/auth";
import { logMealFromTemplate } from "@/lib/meal-template-service";
import { mealTemplateLogSchema } from "@/lib/validators";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const userId = await requireUserIdFromRequest(req);
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const parsed = mealTemplateLogSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
    }

    const entry = await logMealFromTemplate(userId, id, parsed.data);
    if (!entry) {
      return NextResponse.json({ error: "Template not found or could not log meal." }, { status: 404 });
    }

    return NextResponse.json({
      ...entry,
      date: entry.date.toISOString(),
      totalCarbs: entry.totalCarbs ?? 0,
      totalFat: entry.totalFat ?? 0,
    });
  } catch (e) {
    if (e instanceof StaleSessionError || (e instanceof Error && e.message === "Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Could not log meal." }, { status: 500 });
  }
}
