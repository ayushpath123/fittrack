import { listMealTemplates } from "@/lib/meal-template-service";
import { listWorkoutTemplatesForUser } from "@/lib/workout-template-service";
import { buildUserAliasMap, type UserAlias } from "@/lib/voice/memory";
import type { MealTemplate } from "@/types/meal-template";
import type { WorkoutTemplateType } from "@/types/workout";

export type VoiceSearchContext = {
  mealTemplates: MealTemplate[];
  workoutTemplates: WorkoutTemplateType[];
  workoutCardioTemplates: WorkoutTemplateType[];
  aliases: Map<string, UserAlias>;
};

export async function loadVoiceSearchContext(userId: string): Promise<VoiceSearchContext> {
  const [mealTemplates, workoutTemplates, aliases] = await Promise.all([
    listMealTemplates(userId),
    listWorkoutTemplatesForUser(userId),
    buildUserAliasMap(userId),
  ]);

  return {
    mealTemplates,
    workoutTemplates,
    workoutCardioTemplates: workoutTemplates.filter((t) => t.category === "cardio"),
    aliases,
  };
}
