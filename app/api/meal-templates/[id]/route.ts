export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireUserIdFromRequest, StaleSessionError } from "@/lib/auth";
import { deleteMealTemplate, updateMealTemplate } from "@/lib/meal-template-service";
import { mealTemplatePayloadSchema } from "@/lib/validators";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const userId = await requireUserIdFromRequest(req);
    const { id } = await context.params;
    const body = await req.json();
    const parsed = mealTemplatePayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
    }

    const template = await updateMealTemplate(userId, id, parsed.data);
    if (!template) {
      return NextResponse.json({ error: "Template not found." }, { status: 404 });
    }
    return NextResponse.json(template);
  } catch (e) {
    if (e instanceof StaleSessionError || (e instanceof Error && e.message === "Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Could not update template." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const userId = await requireUserIdFromRequest(req);
    const { id } = await context.params;
    const deleted = await deleteMealTemplate(userId, id);
    if (!deleted) {
      return NextResponse.json({ error: "Template not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof StaleSessionError || (e instanceof Error && e.message === "Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Could not delete template." }, { status: 500 });
  }
}
