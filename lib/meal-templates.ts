import type { MealTemplate, MealType } from "@/types/meal-template";

export type MacroSnapshot = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type MacroTargets = MacroSnapshot;

export const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

const MEAL_TYPE_ALIASES: Record<string, MealType> = {
  breakfast: "breakfast",
  lunch: "lunch",
  snack: "snack",
  dinner: "dinner",
  "pre-workout": "snack",
  "post-workout": "snack",
  nashta: "breakfast",
  subah: "breakfast",
  dopahar: "lunch",
  raat: "dinner",
  shaam: "dinner",
};

/** Longer phrases first so "raat ka khana" wins over "raat". */
const MEAL_TYPE_PHRASES: Array<{ phrase: string; type: MealType }> = [
  { phrase: "raat ka khana", type: "dinner" },
  { phrase: "shaam ka khana", type: "dinner" },
  { phrase: "subah ka nashta", type: "breakfast" },
  { phrase: "for breakfast", type: "breakfast" },
  { phrase: "for lunch", type: "lunch" },
  { phrase: "for dinner", type: "dinner" },
  { phrase: "for snack", type: "snack" },
  { phrase: "my breakfast", type: "breakfast" },
  { phrase: "my lunch", type: "lunch" },
  { phrase: "my dinner", type: "dinner" },
  { phrase: "breakfast", type: "breakfast" },
  { phrase: "lunch", type: "lunch" },
  { phrase: "dinner", type: "dinner" },
  { phrase: "snack", type: "snack" },
  { phrase: "nashta", type: "breakfast" },
  { phrase: "dopahar", type: "lunch" },
  { phrase: "shaam", type: "dinner" },
  { phrase: "raat", type: "dinner" },
];

export function parseMealType(value?: string | null): MealType | undefined {
  if (!value?.trim()) return undefined;
  const key = value.trim().toLowerCase();
  if (MEAL_TYPE_ALIASES[key]) return MEAL_TYPE_ALIASES[key];
  return MEAL_TYPES.includes(key as MealType) ? (key as MealType) : undefined;
}

export function normalizeMealType(value?: string | null): MealType {
  return parseMealType(value) ?? "lunch";
}

/** Detect meal slot from spoken text (English / Hinglish). */
export function detectMealTypeFromText(text: string): MealType | undefined {
  const lower = text.toLowerCase();
  for (const { phrase, type } of MEAL_TYPE_PHRASES) {
    if (lower.includes(phrase)) return type;
  }
  return undefined;
}

/** Remove meal-slot words so food search focuses on the item name. */
export function stripMealTypePhrases(text: string): string {
  let result = text;
  for (const { phrase } of MEAL_TYPE_PHRASES) {
    const re = new RegExp(`\\b${phrase.replace(/\s+/g, "\\s+")}\\b`, "gi");
    result = result.replace(re, " ");
  }
  return result.replace(/\s+/g, " ").trim();
}

export function labelMealType(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** 5–11 breakfast, 11–16 lunch, 16–19 snack, else dinner */
export function mealSlotFromHour(hour: number): MealType {
  if (hour >= 5 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 16) return "lunch";
  if (hour >= 16 && hour < 19) return "snack";
  return "dinner";
}

export function detectMealTypeFromTime(date = new Date()): MealType {
  return mealSlotFromHour(date.getHours());
}

export function scaleMacros(macros: MacroSnapshot, multiplier: number): MacroSnapshot {
  const m = Math.max(0.5, Math.min(3, multiplier));
  return {
    calories: Math.round(macros.calories * m),
    protein: Math.round(macros.protein * m * 10) / 10,
    carbs: Math.round(macros.carbs * m * 10) / 10,
    fat: Math.round(macros.fat * m * 10) / 10,
  };
}

export function macroItemPayload(macros: MacroSnapshot) {
  return [{ kind: "macros" as const, ...macros }];
}

export function toMealTemplate(row: {
  id: string;
  userId: string;
  name: string;
  mealType: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  useCount: number;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): MealTemplate {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    mealType: normalizeMealType(row.mealType),
    calories: Math.round(row.calories),
    protein: Math.round(row.protein * 10) / 10,
    carbs: Math.round(row.carbs * 10) / 10,
    fat: Math.round(row.fat * 10) / 10,
    useCount: row.useCount,
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function sortFrequentlyUsed(templates: MealTemplate[]): MealTemplate[] {
  return [...templates].sort((a, b) => {
    if (b.useCount !== a.useCount) return b.useCount - a.useCount;
    const aTime = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
    const bTime = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
    return bTime - aTime;
  });
}

export function filterTemplatesByMealType(templates: MealTemplate[], mealType: MealType): MealTemplate[] {
  return templates.filter((t) => t.mealType === mealType);
}

export function searchTemplates(templates: MealTemplate[], query: string): MealTemplate[] {
  const q = query.trim().toLowerCase();
  if (!q) return templates;
  return templates.filter((t) => t.name.toLowerCase().includes(q));
}

/** Daily meal slots sized from the user's macro targets (seeded as saved templates). */
export function buildDailyMealPresets(targets: MacroTargets): Array<MacroSnapshot & { name: string; mealType: MealType }> {
  const slots: { name: string; mealType: MealType; share: number }[] = [
    { name: "Breakfast", mealType: "breakfast", share: 0.25 },
    { name: "Lunch", mealType: "lunch", share: 0.35 },
    { name: "Snack", mealType: "snack", share: 0.1 },
    { name: "Dinner", mealType: "dinner", share: 0.3 },
  ];

  return slots.map((slot) => ({
    name: slot.name,
    mealType: slot.mealType,
    calories: Math.round(targets.calories * slot.share),
    protein: Math.round(targets.protein * slot.share),
    carbs: Math.round(targets.carbs * slot.share),
    fat: Math.round(targets.fat * slot.share),
  }));
}

export function getRecommendedPreset(
  targets: MacroTargets,
  hour = new Date().getHours(),
): MacroSnapshot & { name: string; mealType: MealType } {
  const slot = mealSlotFromHour(hour);
  return buildDailyMealPresets(targets).find((p) => p.mealType === slot) ?? buildDailyMealPresets(targets)[1];
}

/** @deprecated Use MealTemplate directly */
export type LoggableMealTemplate = MacroSnapshot & {
  id: string;
  name: string;
  mealType: string;
  source: "preset" | "saved";
};
