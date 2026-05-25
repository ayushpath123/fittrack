import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { fetchLeaderboardTop, getCurrentSeasonKey } from "@/lib/leaderboard";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const seasonParam = searchParams.get("season");
  const seasonKey = seasonParam && /^\d{4}-\d{2}$/.test(seasonParam) ? seasonParam : getCurrentSeasonKey();
  const take = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "50") || 50));
  const skip = Math.max(0, Number(searchParams.get("offset") ?? "0") || 0);

  const rows = await fetchLeaderboardTop(prisma, seasonKey, { take, skip, viewerUserId: userId });

  return NextResponse.json({ seasonKey, take, skip, rows });
}
