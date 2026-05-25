import { NextRequest, NextResponse } from "next/server";
import { requireUserIdFromRequest } from "@/lib/auth";
import { weightPayloadSchema } from "@/lib/validators";
import { listWeightLogs, upsertWeightLog } from "@/lib/domain/tracking";

export async function GET(req: NextRequest) {
  const userId = await requireUserIdFromRequest(req);
  const range = req.nextUrl.searchParams.get("range") ?? "7d";
  const logs = await listWeightLogs(userId, range);
  return NextResponse.json(logs);
}

export async function POST(req: NextRequest) {
  const userId = await requireUserIdFromRequest(req);
  const parsed = weightPayloadSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid weight payload", details: parsed.error.flatten() }, { status: 400 });
  }
  const { date, weight, waistCm } = parsed.data;
  const log = await upsertWeightLog({ userId, date, weight, waistCm });
  return NextResponse.json(log);
}
