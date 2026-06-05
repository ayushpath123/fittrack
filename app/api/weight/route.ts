import { NextRequest, NextResponse } from "next/server";
import { requireUserIdFromRequest } from "@/lib/auth";
import { listWeightLogs, upsertWeightLog } from "@/lib/domain/tracking";
import { serializeWeightLog } from "@/lib/weight-serialize";
import { weightPayloadSchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
  const userId = await requireUserIdFromRequest(req);
  const range = req.nextUrl.searchParams.get("range") ?? "7d";
  const logs = await listWeightLogs(userId, range);
  return NextResponse.json(logs.map(serializeWeightLog));
}

export async function POST(req: NextRequest) {
  const userId = await requireUserIdFromRequest(req);
  const parsed = weightPayloadSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid weight payload", details: parsed.error.flatten() }, { status: 400 });
  }
  const { date, weight, waistCm } = parsed.data;
  const log = await upsertWeightLog({ userId, date, weight, waistCm });
  return NextResponse.json(serializeWeightLog(log));
}
