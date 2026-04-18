type Bucket = { count: number; windowStart: number };

const WINDOW_MS = 60 * 60 * 1000;
export const AI_LIMITS = {
  coach: 50,
  estimate_meal: 40,
} as const;

const store = new Map<string, Bucket>();

export type AiRateKind = keyof typeof AI_LIMITS;

export function checkAiRateLimit(userId: string, kind: AiRateKind): { ok: true } | { ok: false; retryAfterSec: number } {
  const limit = AI_LIMITS[kind];
  const key = `${userId}:${kind}`;
  const now = Date.now();
  let b = store.get(key);
  if (!b || now - b.windowStart >= WINDOW_MS) {
    b = { count: 0, windowStart: now };
    store.set(key, b);
  }
  if (b.count >= limit) {
    const retryAfterSec = Math.max(1, Math.ceil((WINDOW_MS - (now - b.windowStart)) / 1000));
    return { ok: false, retryAfterSec };
  }
  b.count += 1;
  return { ok: true };
}
