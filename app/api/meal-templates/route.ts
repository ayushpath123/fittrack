export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireUserIdFromRequest, StaleSessionError } from "@/lib/auth";
import { createMealTemplate, listMealTemplates } from "@/lib/meal-template-service";
import { mealTemplatePayloadSchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserIdFromRequest(req);
    const q = new URL(req.url).searchParams.get("q")?.trim();
    const templates = await listMealTemplates(userId, q || undefined);
    return NextResponse.json({ templates });
  } catch (e) {
    if (e instanceof StaleSessionError || (e instanceof Error && e.message === "Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserIdFromRequest(req);
    const body = await req.json();
    const parsed = mealTemplatePayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
    }

    const template = await createMealTemplate(userId, parsed.data);
    return NextResponse.json(template, { status: 201 });
  } catch (e) {
    if (e instanceof StaleSessionError || (e instanceof Error && e.message === "Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Could not save template." }, { status: 500 });
  }
}
