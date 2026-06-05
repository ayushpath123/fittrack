import { prisma } from "@/lib/prisma";
import { createMealForDay } from "@/lib/domain/tracking";
import { macroItemPayload, normalizeMealType, toMealTemplate } from "@/lib/meal-templates";
import type { MealTemplateInput } from "@/types/meal-template";

export async function listMealTemplates(userId: string, query?: string) {
  const templates = await prisma.mealTemplate.findMany({
    where: {
      userId,
      ...(query ? { name: { contains: query.trim(), mode: "insensitive" } } : {}),
    },
    orderBy: [{ useCount: "desc" }, { updatedAt: "desc" }],
  });

  return templates.map(toMealTemplate);
}

export async function createMealTemplate(userId: string, input: MealTemplateInput) {
  const mealType = normalizeMealType(input.mealType);
  const created = await prisma.mealTemplate.create({
    data: {
      userId,
      name: input.name.trim(),
      mealType,
      calories: input.calories,
      protein: input.protein,
      carbs: input.carbs,
      fat: input.fat,
      items: macroItemPayload(input) as object,
    },
  });
  return toMealTemplate(created);
}

export async function updateMealTemplate(userId: string, id: string, input: MealTemplateInput) {
  const existing = await prisma.mealTemplate.findFirst({ where: { id, userId } });
  if (!existing) return null;

  const mealType = normalizeMealType(input.mealType);
  const updated = await prisma.mealTemplate.update({
    where: { id },
    data: {
      name: input.name.trim(),
      mealType,
      calories: input.calories,
      protein: input.protein,
      carbs: input.carbs,
      fat: input.fat,
      items: macroItemPayload(input) as object,
    },
  });
  return toMealTemplate(updated);
}

export async function deleteMealTemplate(userId: string, id: string) {
  const existing = await prisma.mealTemplate.findFirst({ where: { id, userId } });
  if (!existing) return false;
  await prisma.mealTemplate.delete({ where: { id } });
  return true;
}

export async function logMealFromTemplate(
  userId: string,
  templateId: string,
  options: {
    date?: string;
    mealType?: string;
    servings?: number;
    macros?: { calories: number; protein: number; carbs: number; fat: number };
  },
) {
  const template = await prisma.mealTemplate.findFirst({ where: { id: templateId, userId } });
  if (!template) return null;

  const servings = options.servings ?? 1;
  const base = options.macros ?? {
    calories: template.calories * servings,
    protein: template.protein * servings,
    carbs: template.carbs * servings,
    fat: template.fat * servings,
  };

  const macros = {
    calories: Math.round(base.calories),
    protein: Math.round(base.protein * 10) / 10,
    carbs: Math.round(base.carbs * 10) / 10,
    fat: Math.round(base.fat * 10) / 10,
  };

  const date = options.date ?? new Date().toISOString().split("T")[0];
  const mealType = normalizeMealType(options.mealType ?? template.mealType);

  const result = await createMealForDay({
    userId,
    date,
    mealType,
    items: [],
    macros,
  });

  if ("error" in result) return null;

  await prisma.mealTemplate.update({
    where: { id: templateId },
    data: {
      useCount: { increment: 1 },
      lastUsedAt: new Date(),
    },
  });

  return result.entry;
}
