import { prisma } from "@/lib/prisma";
import { buildDailyMealPresets, macroItemPayload, type MacroTargets } from "@/lib/meal-templates";

/** Ensures each user has macro-based meal templates (idempotent). */
export async function ensureDefaultMealTemplates(userId: string, targets: MacroTargets) {
  const existing = await prisma.mealTemplate.count({ where: { userId } });
  if (existing > 0) return;

  const presets = buildDailyMealPresets(targets);
  await prisma.mealTemplate.createMany({
    data: presets.map((p) => ({
      userId,
      name: p.name,
      mealType: p.mealType,
      calories: p.calories,
      protein: p.protein,
      carbs: p.carbs,
      fat: p.fat,
      items: macroItemPayload(p) as object,
    })),
  });
}
