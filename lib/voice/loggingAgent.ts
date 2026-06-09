import { prisma } from "@/lib/prisma";
import { startOfDay, toLocalDateKey } from "@/lib/date";
import { createMealForDay, upsertWeightLog } from "@/lib/domain/tracking";
import { createWorkoutLog } from "@/lib/domain/workout-logs";
import { logMealFromTemplate } from "@/lib/meal-template-service";
import { logWorkoutFromTemplate } from "@/lib/workout-template-service";
import { detectMealTypeFromTime, labelMealType, parseMealType } from "@/lib/meal-templates";
import type { MealType } from "@/types/meal-template";
import { calculateItemNutrition } from "@/lib/calculations";
import type { FoodItemType } from "@/types";
import type { VoiceConfirmItem, VoiceConfirmResult, VoiceLogPayload } from "@/lib/voice/types";

function mealTypeForPayload(payload: VoiceLogPayload): MealType {
  if (payload.kind === "meal_template" || payload.kind === "meal_food" || payload.kind === "meal_macros") {
    return parseMealType(payload.mealType) ?? detectMealTypeFromTime();
  }
  return detectMealTypeFromTime();
}

async function executePayload(
  userId: string,
  payload: VoiceLogPayload,
  date?: string,
): Promise<{ label: string; success: boolean; error?: string; macros?: { calories: number; protein: number; carbs: number; fat: number } }> {
  const today = date ?? toLocalDateKey(new Date());
  const mealType = mealTypeForPayload(payload);

  try {
    switch (payload.kind) {
      case "meal_template": {
        const entry = await logMealFromTemplate(userId, payload.templateId, {
          date: today,
          mealType,
          servings: payload.servings ?? 1,
        });
        if (!entry) return { label: "Meal template", success: false, error: "Template not found" };
        return {
          label: `${labelMealType(mealType)} logged`,
          success: true,
          macros: {
            calories: entry.totalCalories,
            protein: entry.totalProtein,
            carbs: entry.totalCarbs,
            fat: entry.totalFat,
          },
        };
      }

      case "meal_food": {
        const food = await prisma.foodItem.findUnique({ where: { id: payload.foodId } });
        if (!food) return { label: "Food", success: false, error: "Food not found" };
        const item = payload.grams
          ? { foodId: food.id, grams: payload.grams }
          : { foodId: food.id, multiplier: payload.multiplier ?? 1 };
        const result = await createMealForDay({
          userId,
          date: today,
          mealType,
          items: [item],
        });
        if ("error" in result && result.error) {
          return { label: food.name, success: false, error: result.error.message };
        }
        const nutrition = calculateItemNutrition(food as unknown as FoodItemType, item);
        return {
          label: `${labelMealType(mealType)} · ${food.name}`,
          success: true,
          macros: nutrition,
        };
      }

      case "meal_macros": {
        const result = await createMealForDay({
          userId,
          date: today,
          mealType,
          items: [],
          macros: {
            calories: payload.calories,
            protein: payload.protein,
            carbs: payload.carbs,
            fat: payload.fat,
          },
        });
        if ("error" in result && result.error) {
          return { label: payload.name, success: false, error: result.error.message };
        }
        return {
          label: `${labelMealType(mealType)} · ${payload.name}`,
          success: true,
          macros: {
            calories: payload.calories,
            protein: payload.protein,
            carbs: payload.carbs,
            fat: payload.fat,
          },
        };
      }

      case "workout_template": {
        const result = await logWorkoutFromTemplate(userId, payload.templateId, {
          workoutDate: today,
          duration: payload.duration,
          allowDuplicate: true,
        });
        if (!result) return { label: "Workout", success: false, error: "Template not found" };
        return { label: result.log.workoutName, success: true };
      }

      case "cardio": {
        const cardioTemplates = await prisma.workoutTemplate.findMany({
          where: { userId, category: "cardio" },
          select: { id: true, name: true, duration: true, caloriesBurned: true, cardioType: true },
        });
        const nameLower = payload.name.toLowerCase();
        const matched = cardioTemplates.find(
          (t) => t.cardioType === nameLower || t.name.toLowerCase().includes(nameLower),
        );
        if (matched) {
          const result = await logWorkoutFromTemplate(userId, matched.id, {
            workoutDate: today,
            duration: payload.durationMinutes !== matched.duration ? payload.durationMinutes : undefined,
            allowDuplicate: true,
          });
          if (result) return { label: result.log.workoutName, success: true };
        }
        await createWorkoutLog({
          userId,
          workoutName: payload.name,
          workoutType: "cardio",
          duration: payload.durationMinutes,
          caloriesBurned: payload.caloriesBurned ?? matched?.caloriesBurned ?? payload.durationMinutes * 8,
          workoutDate: today,
        });
        return { label: `${payload.name} · ${payload.durationMinutes} min`, success: true };
      }

      case "hydration": {
        const d = startOfDay(new Date(today));
        await prisma.hydrationLog.upsert({
          where: { userId_date: { userId, date: d } },
          update: { totalMl: { increment: payload.addMl } },
          create: { userId, date: d, totalMl: payload.addMl },
        });
        return { label: `Water +${payload.addMl} ml`, success: true };
      }

      case "weight": {
        await upsertWeightLog({
          userId,
          date: today,
          weight: payload.weightKg,
          waistCm: payload.waistCm,
        });
        return { label: `Weight ${payload.weightKg} kg`, success: true };
      }

      default:
        return { label: "Unknown", success: false, error: "Unsupported payload" };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Log failed";
    return { label: "Log", success: false, error: message };
  }
}

export async function confirmVoiceLogs(
  userId: string,
  items: VoiceConfirmItem[],
  date?: string,
): Promise<VoiceConfirmResult> {
  const logged: VoiceConfirmResult["logged"] = [];
  let totalMacros = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  let hydrationMl = 0;

  for (const item of items) {
    const result = await executePayload(userId, item.payload, date);
    logged.push({
      draftId: item.draftId,
      label: result.label,
      success: result.success,
      error: result.error,
    });
    if (result.macros) {
      totalMacros.calories += result.macros.calories;
      totalMacros.protein += result.macros.protein;
      totalMacros.carbs += result.macros.carbs;
      totalMacros.fat += result.macros.fat;
    }
    if (item.payload.kind === "hydration") {
      hydrationMl += item.payload.addMl;
    }
  }

  return {
    logged,
    nutrition: totalMacros.calories > 0 ? totalMacros : undefined,
    hydrationMl: hydrationMl > 0 ? hydrationMl : undefined,
  };
}
