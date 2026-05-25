import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { GamificationHttpError } from "@/lib/gamification-server";

export type GamificationSessionResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

/**
 * Requires a signed-in user id for gamification routes.
 */
export async function requireGamificationUserId(): Promise<GamificationSessionResult> {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { ok: true, userId };
}

/**
 * Maps domain errors to JSON responses without leaking internals.
 */
export function gamificationErrorResponse(err: unknown): NextResponse {
  if (err instanceof GamificationHttpError) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode });
  }
  console.error("[gamification]", err);
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}
