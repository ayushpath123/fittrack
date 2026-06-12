import { describe, expect, it } from "vitest";
import { formatPlanPrice } from "@/lib/billing-display";

describe("formatPlanPrice", () => {
  it("formats whole-rupee monthly plans without paise", () => {
    expect(formatPlanPrice({ amount: 19900, currency: "INR", period: "monthly", interval: 1 })).toBe("₹199/month");
  });

  it("formats yearly plans with Indian digit grouping", () => {
    expect(formatPlanPrice({ amount: 149900, currency: "INR", period: "yearly", interval: 1 })).toBe("₹1,499/year");
  });

  it("keeps paise when the amount is not a whole rupee", () => {
    expect(formatPlanPrice({ amount: 4950, currency: "INR", period: "monthly", interval: 1 })).toBe("₹49.50/month");
  });

  it("describes multi-period intervals in words", () => {
    expect(formatPlanPrice({ amount: 49900, currency: "INR", period: "monthly", interval: 3 })).toBe(
      "₹499 every 3 months",
    );
  });

  it("returns null for zero, negative, or non-finite amounts", () => {
    expect(formatPlanPrice({ amount: 0, currency: "INR", period: "monthly", interval: 1 })).toBeNull();
    expect(formatPlanPrice({ amount: -100, currency: "INR", period: "monthly", interval: 1 })).toBeNull();
    expect(formatPlanPrice({ amount: Number.NaN, currency: "INR", period: "monthly", interval: 1 })).toBeNull();
  });

  it("returns null for an invalid currency code instead of throwing", () => {
    expect(formatPlanPrice({ amount: 19900, currency: "NOPE!", period: "monthly", interval: 1 })).toBeNull();
  });
});
