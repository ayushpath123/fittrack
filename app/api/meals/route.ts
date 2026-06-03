import { NextRequest, NextResponse } from "next/server";
import { requireUserIdFromRequest } from "@/lib/auth";
import { mealPayloadSchema } from "@/lib/validators";
import { createMealForDay, listMealsForDate } from "@/lib/domain/tracking";
import { MealItem } from "@/types";

export async function GET(req: NextRequest) {
  const userId = await requireUserIdFromRequest(req);
  const dateStr = req.nextUrl.searchParams.get("date") ?? undefined;
  const entries = await listMealsForDate(userId, dateStr);
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const userId = await requireUserIdFromRequest(req);
  const parsed = mealPayloadSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid meal payload", details: parsed.error.flatten() }, { status: 400 });
  }
  const { date, mealType, items, estimateId, macros } = parsed.data;
  const result = await createMealForDay({ userId, date, mealType, items, estimateId, macros });
  if ("error" in result && result.error) {
    return NextResponse.json(
      { error: result.error.message },
      { status: result.error.status },
    );
  }

  const { entry } = result;
  return NextResponse.json(entry);
}
