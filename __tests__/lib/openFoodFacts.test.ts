import { describe, expect, it } from "vitest";
import { normalizeBarcodeInput, parseNutrimentsPer100g } from "@/lib/openFoodFacts";

describe("normalizeBarcodeInput", () => {
  it("strips non-digits and accepts 8–14 length", () => {
    expect(normalizeBarcodeInput("590 1234 1234 017")).toBe("59012341234017");
    expect(normalizeBarcodeInput("12345678")).toBe("12345678");
    expect(normalizeBarcodeInput("1234567")).toBeNull();
    expect(normalizeBarcodeInput("123456789012345")).toBeNull();
  });
});

describe("parseNutrimentsPer100g", () => {
  it("reads kcal and macros", () => {
    const r = parseNutrimentsPer100g({
      "energy-kcal_100g": 365,
      proteins_100g: 6.3,
      carbohydrates_100g: 78,
      fat_100g: 2.1,
    });
    expect(r).toEqual({ calories: 365, protein: 6.3, carbs: 78, fat: 2.1 });
  });

  it("converts kJ to kcal when kcal missing", () => {
    const kj = 2000;
    const r = parseNutrimentsPer100g({
      "energy-kj_100g": kj,
      proteins_100g: 10,
      carbohydrates_100g: 20,
      fat_100g: 5,
    });
    expect(r?.calories).toBe(Math.round((kj / 4.184) * 10) / 10);
  });

  it("returns null when incomplete", () => {
    expect(parseNutrimentsPer100g({ "energy-kcal_100g": 100 })).toBeNull();
    expect(parseNutrimentsPer100g(null)).toBeNull();
  });
});
