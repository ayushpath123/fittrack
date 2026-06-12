import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { trackEvent, type AnalyticsEventName } from "@/lib/analytics";

export const runtime = "nodejs";

/** Only client-originated events may be reported here; server events are written directly. */
const CLIENT_EVENTS = new Set<AnalyticsEventName>([
  "share_clicked",
  "share_completed",
  "notification_granted",
  "notification_denied",
  "pricing_viewed",
]);

const META_MAX_CHARS = 2000;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { name, meta } = (body ?? {}) as { name?: unknown; meta?: unknown };
  if (typeof name !== "string" || !CLIENT_EVENTS.has(name as AnalyticsEventName)) {
    return NextResponse.json({ error: "Unknown event" }, { status: 400 });
  }
  let safeMeta: Record<string, unknown> | undefined;
  if (meta !== undefined && meta !== null) {
    if (typeof meta !== "object" || Array.isArray(meta) || JSON.stringify(meta).length > META_MAX_CHARS) {
      return NextResponse.json({ error: "Invalid meta" }, { status: 400 });
    }
    safeMeta = meta as Record<string, unknown>;
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET }).catch(() => null);
  const userId = typeof token?.sub === "string" ? token.sub : null;

  trackEvent(name as AnalyticsEventName, { userId, meta: safeMeta });
  return new NextResponse(null, { status: 204 });
}
