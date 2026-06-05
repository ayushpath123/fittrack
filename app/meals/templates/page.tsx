import { listMealTemplates } from "@/lib/meal-template-service";
import { requireUserIdForPage } from "@/lib/auth";
import { MealTemplatesClient } from "./MealTemplatesClient";

export default async function MealTemplatesPage() {
  const userId = await requireUserIdForPage();
  const templates = await listMealTemplates(userId);

  return <MealTemplatesClient initialTemplates={templates} />;
}
