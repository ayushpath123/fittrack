import { NextRequest, NextResponse } from "next/server";
import { requireUserIdFromRequest } from "@/lib/auth";
import { goalsPayloadSchema } from "@/lib/validators";
import { getGoalsForUser, saveGoalsForUser } from "@/lib/domain/tracking";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserIdFromRequest(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const goals = await getGoalsForUser(userId);
  return NextResponse.json(goals);
}

export async function PUT(req: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserIdFromRequest(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = goalsPayloadSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid goals payload", details: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const goals = await saveGoalsForUser(userId, parsed.data);
    return NextResponse.json(goals);
  } catch (e) {
    console.error("[goals PUT]", e);
    return NextResponse.json({ error: "Could not save goals. Try again or sign out and back in." }, { status: 500 });
  }
}
