import { Plan } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { hasProAccess } from "@/lib/billing";

describe("hasProAccess", () => {
  it("is true only for pro plan", () => {
    expect(hasProAccess({ plan: Plan.pro })).toBe(true);
    expect(hasProAccess({ plan: Plan.free })).toBe(false);
  });
});
