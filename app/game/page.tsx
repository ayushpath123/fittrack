import { requireUserIdForPage } from "@/lib/auth";
import { GameModeClient } from "./GameModeClient";

export default async function GameModePage() {
  await requireUserIdForPage();
  return <GameModeClient />;
}
