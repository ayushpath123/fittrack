import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { importRequestSchema } from "@/lib/validators";
import { executeBackupImport } from "@/lib/importBackup";

const MAX_IMPORT_ROWS = 5000;

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = importRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid import body", details: parsed.error.flatten() }, { status: 400 });
  }

  const { mode, backup } = parsed.data;
  const hydrationRows = backup.hydrationLogs?.length ?? 0;
  const totalRows = backup.meals.length + backup.workouts.length + backup.weightLogs.length + hydrationRows;
  if (totalRows > MAX_IMPORT_ROWS) {
    return NextResponse.json(
      { error: `Import too large (${totalRows} rows). Limit is ${MAX_IMPORT_ROWS} rows per request.` },
      { status: 413 },
    );
  }

  const result = await executeBackupImport(userId, mode, backup);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json(result);
}
