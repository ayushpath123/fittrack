import { prisma } from "@/lib/prisma";
import { listMealTemplates } from "@/lib/meal-template-service";
import { listWorkoutTemplatesForUser } from "@/lib/workout-template-service";
import {
  confidenceFromScore,
  fuzzyScore,
  tierFromConfidence,
  type ConfidenceTier,
} from "@/lib/voice/fuzzyMatch";
import { buildUserAliasMap, lookupAlias } from "@/lib/voice/memory";
import { detectCardioKeyword, queryTokenCoverage, stripSpeechFillers } from "@/lib/voice/normalizeSpeech";
import type { MealType } from "@/types/meal-template";
import type { MatchCandidate } from "@/lib/voice/types";

/** Semantic synonyms for workout/food matching without embeddings. */
const SEMANTIC_ALIASES: Record<string, string[]> = {
  chest: ["push", "chest", "pec", "bench"],
  push: ["chest", "push", "shoulder", "tricep"],
  pull: ["back", "pull", "lat", "bicep"],
  leg: ["legs", "squat", "quad", "hamstring"],
  cardio: ["running", "walk", "treadmill", "cycling", "jog", "cardio"],
  walk: ["walking", "walk", "stroll"],
  run: ["running", "run", "jog", "jogging"],
  oats: ["oatmeal", "oats", "porridge"],
  protein: ["protein", "whey", "shake"],
  water: ["water", "pani", "paani", "hydration"],
  apple: ["apple", "seb"],
  rice: ["rice", "chawal", "paneer rice"],
  roti: ["roti", "chapati", "phulka"],
};

function expandWithSynonyms(query: string): string[] {
  const normalized = query.toLowerCase();
  const terms = [normalized];
  for (const [key, synonyms] of Object.entries(SEMANTIC_ALIASES)) {
    if (synonyms.some((s) => normalized.includes(s))) {
      terms.push(key, ...synonyms);
    }
  }
  return [...new Set(terms)];
}

function bestSynonymBoost(query: string, candidate: string): number {
  const qTerms = expandWithSynonyms(query);
  const cTerms = expandWithSynonyms(candidate);
  for (const q of qTerms) {
    for (const c of cTerms) {
      if (q === c || c.includes(q) || q.includes(c)) return 0.12;
    }
  }
  return 0;
}

export type SearchResult = {
  candidates: MatchCandidate[];
  best: MatchCandidate | null;
  tier: ConfidenceTier;
};

async function searchMealTemplates(
  userId: string,
  query: string,
  preferredMealType?: MealType,
): Promise<SearchResult> {
  const cleanQuery = stripSpeechFillers(query) || query;
  const [templates, aliases] = await Promise.all([
    listMealTemplates(userId),
    buildUserAliasMap(userId),
  ]);

  const aliasHit = lookupAlias(aliases, cleanQuery);
  if (aliasHit?.targetType === "meal_template") {
    const template = templates.find((t) => t.id === aliasHit.targetId);
    if (template) {
      const confidence = confidenceFromScore(0.95, Math.min(0.05, aliasHit.count * 0.002));
      return {
        candidates: [
          {
            id: template.id,
            name: template.name,
            confidence,
            source: "memory",
            meta: { mealType: template.mealType, macros: template },
          },
        ],
        best: {
          id: template.id,
          name: template.name,
          confidence,
          source: "memory",
          meta: { mealType: template.mealType, macros: template },
        },
        tier: "auto",
      };
    }
  }

  const scored = templates.map((t) => {
    const coverage = queryTokenCoverage(cleanQuery, t.name);
    const base = fuzzyScore(cleanQuery, t.name);
    const boost = bestSynonymBoost(cleanQuery, t.name) + Math.min(0.08, t.useCount * 0.004);
    const mealTypeBoost = preferredMealType && t.mealType === preferredMealType ? 0.12 : 0;
    const score = Math.min(1, base * 0.35 + coverage * 0.55 + boost + mealTypeBoost);
    return {
      id: t.id,
      name: t.name,
      confidence: confidenceFromScore(score),
      source: "meal_template" as const,
      meta: { mealType: t.mealType, macros: t, coverage },
    };
  });

  scored.sort((a, b) => b.confidence - a.confidence);
  const top = scored.slice(0, 5);
  const best = top[0] ?? null;
  const tier = best ? tierFromConfidence(best.confidence) : "ask";
  return { candidates: top, best, tier };
}

async function searchFoodItems(query: string): Promise<SearchResult> {
  const cleanQuery = stripSpeechFillers(query) || query;
  const firstToken = significantFoodSearchToken(cleanQuery);
  const foods = await prisma.foodItem.findMany({
    where: { name: { contains: firstToken, mode: "insensitive" } },
    take: 20,
    select: {
      id: true,
      name: true,
      calories: true,
      protein: true,
      carbs: true,
      fat: true,
      baseWeightGrams: true,
    },
  });

  const scored = foods.map((f) => {
    const coverage = queryTokenCoverage(cleanQuery, f.name);
    const score = Math.min(1, fuzzyScore(cleanQuery, f.name) * 0.4 + coverage * 0.5 + bestSynonymBoost(cleanQuery, f.name));
    return {
      id: f.id,
      name: f.name,
      confidence: confidenceFromScore(score),
      source: "food" as const,
      meta: { food: f },
    };
  });

  scored.sort((a, b) => b.confidence - a.confidence);
  const top = scored.slice(0, 5);
  const best = top[0] ?? null;
  return { candidates: top, best, tier: best ? tierFromConfidence(best.confidence) : "ask" };
}

function significantFoodSearchToken(query: string): string {
  const tokens = query.split(" ").filter(Boolean);
  return tokens.find((t) => t.length > 3) ?? tokens[0] ?? query;
}

async function searchWorkoutTemplates(userId: string, query: string, category?: string): Promise<SearchResult> {
  const cleanQuery = stripSpeechFillers(query) || query;
  const cardioKeyword = detectCardioKeyword(cleanQuery);
  const [templates, aliases] = await Promise.all([
    listWorkoutTemplatesForUser(userId, category),
    buildUserAliasMap(userId),
  ]);

  const aliasHit = lookupAlias(aliases, cleanQuery);
  if (aliasHit?.targetType === "workout_template") {
    const template = templates.find((t) => t.id === aliasHit.targetId);
    if (template) {
      const confidence = confidenceFromScore(0.94, Math.min(0.05, aliasHit.count * 0.003));
      return {
        candidates: [
          {
            id: template.id,
            name: template.name,
            confidence,
            source: "memory",
            meta: { template },
          },
        ],
        best: {
          id: template.id,
          name: template.name,
          confidence,
          source: "memory",
          meta: { template },
        },
        tier: "auto",
      };
    }
  }

  const scored = templates.map((t) => {
    const base = fuzzyScore(cleanQuery, t.name);
    const coverage = queryTokenCoverage(cleanQuery, t.name);
    const descBoost = t.description ? fuzzyScore(cleanQuery, t.description) * 0.2 : 0;
    const typeBoost = fuzzyScore(cleanQuery, t.workoutType) * 0.15;
    const cardioBoost = t.cardioType ? fuzzyScore(cleanQuery, t.cardioType) * 0.35 : 0;
    const cardioKeywordBoost =
      cardioKeyword && t.cardioType === cardioKeyword ? 0.35 : cardioKeyword && t.name.toLowerCase().includes(cardioKeyword) ? 0.25 : 0;
    const useBoost = Math.min(0.08, (t.useCount ?? 0) * 0.003);
    const synBoost = bestSynonymBoost(cleanQuery, `${t.name} ${t.workoutType} ${t.cardioType ?? ""}`);
    const score = Math.min(
      1,
      base * 0.3 + coverage * 0.35 + descBoost + typeBoost + cardioBoost + cardioKeywordBoost + useBoost + synBoost,
    );
    return {
      id: t.id,
      name: t.name,
      confidence: confidenceFromScore(score),
      source: "workout_template" as const,
      meta: { template: t },
    };
  });

  scored.sort((a, b) => b.confidence - a.confidence);
  const top = scored.slice(0, 5);
  const best = top[0] ?? null;
  return { candidates: top, best, tier: best ? tierFromConfidence(best.confidence) : "ask" };
}

export async function searchForEntity(
  userId: string,
  query: string,
  intent: "food" | "workout" | "cardio",
  options?: { mealType?: MealType },
): Promise<SearchResult> {
  if (intent === "food") {
    const templateResult = await searchMealTemplates(userId, query, options?.mealType);
    const topTemplate = templateResult.best ?? templateResult.candidates[0] ?? null;
    const templateCoverage = (topTemplate?.meta?.coverage as number | undefined) ?? 0;

    if (topTemplate && (templateCoverage >= 0.34 || topTemplate.confidence >= 55)) {
      return { ...templateResult, best: topTemplate };
    }

    const foodResult = await searchFoodItems(query);
    if (!topTemplate) return foodResult;

    const foodBest = foodResult.best;
    if (foodBest && foodBest.confidence > topTemplate.confidence + 20 && templateCoverage === 0) {
      return foodResult;
    }

    return { ...templateResult, best: topTemplate };
  }

  if (intent === "cardio") {
    return searchWorkoutTemplates(userId, query, "cardio");
  }

  return searchWorkoutTemplates(userId, query);
}

/** Parse water amount from natural language. */
export function parseWaterMl(text: string): number | null {
  const lower = text.toLowerCase();
  const litreMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:litre|liter|l)\b/);
  if (litreMatch) return Math.round(parseFloat(litreMatch[1]!) * 1000);

  const glassMatch = lower.match(/(\d+)\s*(?:glass|glasses|cup|cups)\b/);
  if (glassMatch) return parseInt(glassMatch[1]!, 10) * 250;

  const mlMatch = lower.match(/(\d+)\s*(?:ml|millilitre|milliliter)\b/);
  if (mlMatch) return parseInt(mlMatch[1]!, 10);

  if (/\b(one|ek)\s*(?:litre|liter|l)\b/.test(lower)) return 1000;
  if (/\b(half)\s*(?:litre|liter|l)\b/.test(lower)) return 500;
  if (/\bwater\b|\bpani\b|\bpaani\b|\bdrank\b/.test(lower) && !mlMatch && !litreMatch) return 250;

  return null;
}
