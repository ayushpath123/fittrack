/** Normalize user input to 8–14 digit barcode (EAN/UPC). */
export function normalizeBarcodeInput(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 14) return null;
  return digits;
}

type Nutriments = Record<string, unknown>;

function num(n: unknown): number | undefined {
  if (typeof n === "number" && Number.isFinite(n)) return n;
  if (typeof n === "string" && n.trim() !== "") {
    const v = parseFloat(n.replace(",", "."));
    if (Number.isFinite(v)) return v;
  }
  return undefined;
}

/** Extract per-100g macros from Open Food Facts nutriments object. */
export function parseNutrimentsPer100g(nutriments: Nutriments | undefined | null): {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
} | null {
  if (!nutriments || typeof nutriments !== "object") return null;

  let calories = num(nutriments["energy-kcal_100g"]);
  if (calories === undefined) {
    const kj = num(nutriments["energy-kj_100g"]) ?? num(nutriments["energy_100g"]);
    if (kj !== undefined) calories = kj / 4.184;
  }

  const protein = num(nutriments["proteins_100g"]);
  let carbs = num(nutriments["carbohydrates_100g"]);
  if (carbs === undefined) carbs = num(nutriments["carbs_100g"]);
  const fat = num(nutriments["fat_100g"]);

  if (
    calories === undefined ||
    protein === undefined ||
    carbs === undefined ||
    fat === undefined
  ) {
    return null;
  }

  if (calories < 0 || protein < 0 || carbs < 0 || fat < 0) return null;

  return {
    calories: Math.round(calories * 10) / 10,
    protein: Math.round(protein * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    fat: Math.round(fat * 10) / 10,
  };
}

export type OffLookupResult = {
  barcode: string;
  name: string;
  baseQuantity: string;
  baseWeightGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

const OFF_USER_AGENT = "FitTrackPro/1.0 (https://github.com/healthify)";

export async function fetchOpenFoodFactsProduct(barcode: string): Promise<OffLookupResult | null> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`;
  const res = await fetch(url, {
    headers: { "User-Agent": OFF_USER_AGENT },
    cache: "no-store",
  });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    status?: number;
    product?: {
      product_name?: string;
      product_name_en?: string;
      generic_name?: string;
      abbreviated_product_name?: string;
      nutriments?: Nutriments;
    };
  };

  if (data.status !== 1 || !data.product) return null;

  const p = data.product;
  const name =
    [p.product_name, p.product_name_en, p.generic_name, p.abbreviated_product_name].find(
      (s) => typeof s === "string" && s.trim().length > 0,
    )?.trim() ?? `Product ${barcode}`;

  const per100 = parseNutrimentsPer100g(p.nutriments);
  if (!per100) return null;

  return {
    barcode,
    name,
    baseQuantity: "100g",
    baseWeightGrams: 100,
    ...per100,
  };
}
