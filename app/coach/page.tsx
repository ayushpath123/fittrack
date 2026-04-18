import { requireUserId } from "@/lib/auth";
import { CoachClient } from "./CoachClient";

export default async function CoachPage() {
  await requireUserId();
  return <CoachClient />;
}
