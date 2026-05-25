import { requireUserId } from "@/lib/auth";
import { GameModeClient } from "./GameModeClient";

export default async function GameModePage() {
  await requireUserId();
  return <GameModeClient />;
}
