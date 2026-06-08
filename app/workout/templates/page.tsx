import { WorkoutTemplatesClient } from "./WorkoutTemplatesClient";
import { requireUserIdForPage } from "@/lib/auth";
import { ensureDefaultWorkoutTemplates } from "@/lib/default-workout-templates";
import { listWorkoutTemplatesForUser } from "@/lib/workout-template-service";

export default async function WorkoutTemplatesPage() {
  const userId = await requireUserIdForPage();
  await ensureDefaultWorkoutTemplates(userId);
  const templates = await listWorkoutTemplatesForUser(userId);

  return <WorkoutTemplatesClient initialTemplates={templates} />;
}
