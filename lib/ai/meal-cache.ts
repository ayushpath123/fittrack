import type { MealNutrition } from "@/types/nutrition";

export const MEAL_CACHE: Record<string, MealNutrition> = {
  "2 roti dal": { calories: 420, protein: 18, carbs: 62, fat: 9, confidence: 0.92 },
  "poha 1 plate": { calories: 250, protein: 5, carbs: 45, fat: 6, confidence: 0.9 },
  "idli 3 sambar": { calories: 280, protein: 9, carbs: 52, fat: 3, confidence: 0.91 },
  "paratha 2 butter": { calories: 480, protein: 10, carbs: 58, fat: 22, confidence: 0.88 },
  "dal rice 1 bowl": { calories: 450, protein: 16, carbs: 72, fat: 8, confidence: 0.89 },
  "upma 1 plate": { calories: 300, protein: 7, carbs: 48, fat: 10, confidence: 0.87 },
  "curd rice 1 bowl": { calories: 320, protein: 10, carbs: 55, fat: 6, confidence: 0.9 },
  "rajma chawal": { calories: 520, protein: 22, carbs: 82, fat: 10, confidence: 0.88 },
  "paneer bhurji 100g": { calories: 290, protein: 18, carbs: 6, fat: 21, confidence: 0.85 },
  "chai 1 cup": { calories: 60, protein: 2, carbs: 8, fat: 2, confidence: 0.95 },
  "boiled egg 2": { calories: 140, protein: 12, carbs: 0, fat: 10, confidence: 0.98 },
  "banana 1 medium": { calories: 90, protein: 1, carbs: 23, fat: 0, confidence: 0.97 },
  "masala dosa": { calories: 390, protein: 8, carbs: 52, fat: 16, confidence: 0.88 },
  "plain dosa": { calories: 170, protein: 4, carbs: 28, fat: 4, confidence: 0.9 },
  "sambar 1 bowl": { calories: 140, protein: 6, carbs: 18, fat: 5, confidence: 0.9 },
  "chole bhature": { calories: 620, protein: 18, carbs: 74, fat: 28, confidence: 0.84 },
  "veg pulao 1 plate": { calories: 360, protein: 8, carbs: 58, fat: 10, confidence: 0.88 },
  "chicken curry 1 serving": { calories: 310, protein: 26, carbs: 6, fat: 20, confidence: 0.86 },
  "mutton curry 1 serving": { calories: 390, protein: 24, carbs: 4, fat: 30, confidence: 0.83 },
  "fish curry 1 serving": { calories: 250, protein: 24, carbs: 5, fat: 14, confidence: 0.85 },
  "khichdi 1 bowl": { calories: 320, protein: 10, carbs: 52, fat: 8, confidence: 0.9 },
  "besan chilla 2": { calories: 260, protein: 12, carbs: 24, fat: 12, confidence: 0.88 },
  "oats upma 1 bowl": { calories: 240, protein: 8, carbs: 34, fat: 8, confidence: 0.89 },
  "sprouts salad 1 bowl": { calories: 180, protein: 12, carbs: 24, fat: 4, confidence: 0.9 },
  "paneer tikka 150g": { calories: 330, protein: 24, carbs: 8, fat: 22, confidence: 0.86 },
  "roti 1": { calories: 110, protein: 3, carbs: 18, fat: 2, confidence: 0.93 },
  "rice 1 bowl": { calories: 210, protein: 4, carbs: 45, fat: 0, confidence: 0.93 },
  "dal 1 bowl": { calories: 180, protein: 10, carbs: 22, fat: 5, confidence: 0.91 },
  "omelette 2 egg": { calories: 190, protein: 13, carbs: 2, fat: 14, confidence: 0.92 },
  "peanut chaat 1 bowl": { calories: 280, protein: 11, carbs: 18, fat: 18, confidence: 0.87 },
};

export function checkMealCache(input: string): MealNutrition | null {
  const normalized = input.toLowerCase().trim().replace(/\s+/g, " ");
  return MEAL_CACHE[normalized] ?? null;
}
