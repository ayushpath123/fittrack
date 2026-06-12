import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Funnel + engagement events. Server-emitted names live here; client-emitted names must
 * also be allowlisted in `app/api/events/route.ts`. */
export type AnalyticsEventName =
  | "signup"
  | "meal_logged"
  | "workout_logged"
  | "weight_logged"
  | "checkout_started"
  | "subscription_activated"
  | "subscription_cancelled"
  | "share_clicked"
  | "share_completed"
  | "notification_granted"
  | "notification_denied"
  | "pricing_viewed";

/** Fire-and-forget: analytics must never block or break the request path. */
export function trackEvent(
  name: AnalyticsEventName,
  opts?: { userId?: string | null; meta?: Record<string, unknown> },
): void {
  void prisma.analyticsEvent
    .create({
      data: {
        name,
        userId: opts?.userId ?? null,
        meta: opts?.meta ? (opts.meta as Prisma.InputJsonValue) : undefined,
      },
    })
    .catch(() => {});
}
