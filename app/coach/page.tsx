import { requireUserIdForPage } from "@/lib/auth";
import { CoachClient } from "./CoachClient";

export default async function CoachPage() {
  await requireUserIdForPage();
  return <CoachClient />;
}
