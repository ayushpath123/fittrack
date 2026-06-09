import { Plan } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { hasProAccess } from "@/lib/billing";

describe("hasProAccess", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is true for pro plan", () => {
    expect(hasProAccess({ plan: Plan.pro, subscriptionStatus: null })).toBe(true);
  });

  it("is false for free plan without subscription", () => {
    expect(hasProAccess({ plan: Plan.free, subscriptionStatus: null })).toBe(false);
  });

  it("is true for active subscription status", () => {
    expect(hasProAccess({ plan: Plan.free, subscriptionStatus: "active" })).toBe(true);
  });

  it("is true for admin emails", () => {
    vi.stubEnv("ADMIN_EMAILS", "admin@fittrack.com");
    expect(hasProAccess({ plan: Plan.free, subscriptionStatus: null, email: "admin@fittrack.com" })).toBe(true);
  });
});
