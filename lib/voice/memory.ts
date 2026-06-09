import { prisma } from "@/lib/prisma";
import { normalizeForMatch } from "@/lib/voice/fuzzyMatch";
import { queryTokenCoverage } from "@/lib/voice/normalizeSpeech";

export type UserAlias = {
  alias: string;
  targetId: string;
  targetName: string;
  targetType: "meal_template" | "workout_template" | "food";
  count: number;
};

/** Build alias map from user's logging history (frequent full names → template). */
export async function buildUserAliasMap(userId: string): Promise<Map<string, UserAlias>> {
  const aliases = new Map<string, UserAlias>();

  const [mealTemplates, workoutTemplates] = await Promise.all([
    prisma.mealTemplate.findMany({
      where: { userId, useCount: { gte: 5 } },
      orderBy: { useCount: "desc" },
      take: 50,
      select: { id: true, name: true, useCount: true },
    }),
    prisma.workoutTemplate.findMany({
      where: { userId, useCount: { gte: 3 } },
      orderBy: { useCount: "desc" },
      take: 50,
      select: { id: true, name: true, useCount: true },
    }),
  ]);

  for (const t of mealTemplates) {
    const key = normalizeForMatch(t.name);
    if (key.length < 4) continue;
    const existing = aliases.get(key);
    if (!existing || t.useCount > existing.count) {
      aliases.set(key, {
        alias: t.name,
        targetId: t.id,
        targetName: t.name,
        targetType: "meal_template",
        count: t.useCount,
      });
    }
  }

  for (const t of workoutTemplates) {
    const key = normalizeForMatch(t.name);
    if (key.length < 4) continue;
    const existing = aliases.get(key);
    if (!existing || t.useCount > existing.count) {
      aliases.set(key, {
        alias: t.name,
        targetId: t.id,
        targetName: t.name,
        targetType: "workout_template",
        count: t.useCount,
      });
    }
  }

  return aliases;
}

export function lookupAlias(aliases: Map<string, UserAlias>, query: string): UserAlias | null {
  const key = normalizeForMatch(query);
  if (!key) return null;

  const exact = aliases.get(key);
  if (exact) return exact;

  let best: UserAlias | null = null;
  let bestCoverage = 0;

  for (const [aliasKey, alias] of aliases) {
    if (aliasKey.length < 6) continue;
    const coverage = queryTokenCoverage(query, alias.targetName);
    if (coverage >= 0.75 && coverage > bestCoverage) {
      best = alias;
      bestCoverage = coverage;
    }
    if (key.includes(aliasKey) && aliasKey.length >= 8 && coverage >= 0.5) {
      if (coverage > bestCoverage) {
        best = alias;
        bestCoverage = coverage;
      }
    }
  }

  return best;
}
