import { calculateMealTotals } from "@/lib/calculations";
import type { FoodItemType, MealItem, MealTemplateType } from "@/types";

export type MacroSnapshot = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type MacroTargets = MacroSnapshot;

export type LoggableMealTemplate = MacroSnapshot & {
  id: string;
  name: string;
  mealType: string;
  source: "preset" | "saved";
};

const MEAL_TYPE_ALIASES: Record<string, string> = {
  breakfast: "breakfast",
  lunch: "lunch",
  snack: "snack",
  dinner: "dinner",
  "pre-workout": "snack",
  "post-workout": "snack",
};

export function normalizeMealType(value?: string | null): string {
  if (!value) return "lunch";
  const key = value.trim().toLowerCase();
  return MEAL_TYPE_ALIASES[key] ?? (["breakfast", "lunch", "snack", "dinner"].includes(key) ? key : "lunch");
}

function isMacroItem(item: unknown): item is MacroSnapshot & { kind: "macros" } {
  if (!item || typeof item !== "object") return false;
  const row = item as Record<string, unknown>;
  return row.kind === "macros" && typeof row.calories === "number";
}

export function parseTemplateMacros(
  template: MealTemplateType,
  foodById: Map<string, FoodItemType>,
): MacroSnapshot | null {
  const rawItems = template.items as unknown[];
  if (rawItems.length === 1 && isMacroItem(rawItems[0])) {
    const m = rawItems[0];
    return {
      calories: Math.round(m.calories),
      protein: Math.round(m.protein),
      carbs: Math.round(m.carbs),
      fat: Math.round(m.fat),
    };
  }

  const mealItems: MealItem[] = [];
  const foods: FoodItemType[] = [];
  for (const row of rawItems) {
    if (!row || typeof row !== "object") continue;
    const item = row as { foodId?: string; quantityMultiplier?: number };
    if (!item.foodId) continue;
    const food = foodById.get(item.foodId);
    if (!food) return null;
    mealItems.push({
      foodId: item.foodId,
      multiplier: Math.max(0.5, Number(item.quantityMultiplier || 1)),
    });
    foods.push(food);
  }
  if (!mealItems.length) return null;

  const totals = calculateMealTotals(foods, mealItems);
  return {
    calories: Math.round(totals.totalCalories),
    protein: Math.round(totals.totalProtein),
    carbs: Math.round(totals.totalCarbs),
    fat: Math.round(totals.totalFat),
  };
}

/** Daily meal slots sized from the user's macro targets (one tap to log). */
export function buildDailyMealPresets(targets: MacroTargets): LoggableMealTemplate[] {
  const slots: { id: string; name: string; mealType: string; share: number }[] = [
    { id: "preset-breakfast", name: "Breakfast", mealType: "breakfast", share: 0.25 },
    { id: "preset-lunch", name: "Lunch", mealType: "lunch", share: 0.35 },
    { id: "preset-snack", name: "Snack", mealType: "snack", share: 0.1 },
    { id: "preset-dinner", name: "Dinner", mealType: "dinner", share: 0.3 },
  ];

  return slots.map((slot) => ({
    id: slot.id,
    name: slot.name,
    mealType: slot.mealType,
    source: "preset" as const,
    calories: Math.round(targets.calories * slot.share),
    protein: Math.round(targets.protein * slot.share),
    carbs: Math.round(targets.carbs * slot.share),
    fat: Math.round(targets.fat * slot.share),
  }));
}

export function buildLoggableTemplates(
  targets: MacroTargets,
  saved: MealTemplateType[],
  foods: FoodItemType[],
): LoggableMealTemplate[] {
  const foodById = new Map(foods.map((f) => [f.id, f]));
  const presets = buildDailyMealPresets(targets);
  const fromSaved: LoggableMealTemplate[] = [];

  for (const template of saved) {
    const macros = parseTemplateMacros(template, foodById);
    if (!macros) continue;
    fromSaved.push({
      id: template.id,
      name: template.name,
      mealType: normalizeMealType(template.mealType),
      source: "saved",
      ...macros,
    });
  }

  const savedSlots = new Set(fromSaved.map((t) => t.mealType));
  const presetsWithoutDupes = presets.filter((p) => !savedSlots.has(p.mealType));
  return [...presetsWithoutDupes, ...fromSaved];
}

export function macroItemPayload(macros: MacroSnapshot) {
  return [{ kind: "macros" as const, ...macros }];
}

export function mealSlotFromHour(hour: number): "breakfast" | "lunch" | "snack" | "dinner" {
  if (hour < 11) return "breakfast";
  if (hour < 15) return "lunch";
  if (hour < 18) return "snack";
  return "dinner";
}

export function getRecommendedPreset(targets: MacroTargets, hour = new Date().getHours()): LoggableMealTemplate {
  const slot = mealSlotFromHour(hour);
  return buildDailyMealPresets(targets).find((p) => p.mealType === slot) ?? buildDailyMealPresets(targets)[1];
}
