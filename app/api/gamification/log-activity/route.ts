import { NextResponse } from "next/server";
import { z } from "zod";
import { applyActivityLogMutation, getRequestAuditMeta, GamificationHttpError } from "@/lib/gamification-server";
import { gamificationErrorResponse, requireGamificationUserId } from "../_http";

const bodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(["meal", "workout", "hydration"]),
});

export async function POST(req: Request) {
  const auth = await requireGamificationUserId();
  if (!auth.ok) return auth.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    const summary = await applyActivityLogMutation({
      userId: auth.userId,
      dateKey: parsed.data.date,
      type: parsed.data.type,
      meta: getRequestAuditMeta(req),
    });
    return NextResponse.json(summary);
  } catch (e) {
    if (e instanceof GamificationHttpError && e.statusCode === 403) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return gamificationErrorResponse(e);
  }
}
