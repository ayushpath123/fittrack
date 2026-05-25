import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth";
import { sanitizeLeaderboardAlias } from "@/lib/leaderboard";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  leaderboardPublic: z.boolean().optional(),
  leaderboardAlias: z.union([z.string().max(64), z.null()]).optional(),
});

export async function GET() {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { leaderboardPublic: true, leaderboardAlias: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    leaderboardPublic: user.leaderboardPublic,
    leaderboardAlias: user.leaderboardAlias,
  });
}

export async function PATCH(req: Request) {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const data: { leaderboardPublic?: boolean; leaderboardAlias?: string | null } = {};
  if (parsed.data.leaderboardPublic !== undefined) {
    data.leaderboardPublic = parsed.data.leaderboardPublic;
  }
  if (parsed.data.leaderboardAlias !== undefined) {
    data.leaderboardAlias =
      parsed.data.leaderboardAlias === null ? null : sanitizeLeaderboardAlias(parsed.data.leaderboardAlias);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: { leaderboardPublic: true, leaderboardAlias: true },
  });

  return NextResponse.json({
    leaderboardPublic: user.leaderboardPublic,
    leaderboardAlias: user.leaderboardAlias,
  });
}
