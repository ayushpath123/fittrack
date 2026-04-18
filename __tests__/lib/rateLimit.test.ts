import { describe, expect, it } from "vitest";
import { AI_LIMITS, checkAiRateLimit } from "@/lib/ai/rateLimit";

describe("checkAiRateLimit", () => {
  it("blocks after the hourly cap for a fixed user id", () => {
    const uid = `rate_test_${Math.random().toString(36).slice(2)}`;
    for (let i = 0; i < AI_LIMITS.coach; i++) {
      expect(checkAiRateLimit(uid, "coach").ok).toBe(true);
    }
    const r = checkAiRateLimit(uid, "coach");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.retryAfterSec).toBeGreaterThan(0);
  });

  it("uses separate buckets for coach and estimate_meal", () => {
    const uid = `rate_test_${Math.random().toString(36).slice(2)}`;
    expect(checkAiRateLimit(uid, "coach").ok).toBe(true);
    expect(checkAiRateLimit(uid, "estimate_meal").ok).toBe(true);
  });
});
