import {
  detectMealTypeFromText,
  detectMealTypeFromTime,
  parseMealType,
  stripMealTypePhrases,
} from "@/lib/meal-templates";
import { estimateFoodMacros } from "@/lib/voice/estimateMacros";
import { extractFromTranscript } from "@/lib/voice/nlpPipeline";
import { detectCardioKeyword, parseWeightKg, stripSpeechFillers } from "@/lib/voice/normalizeSpeech";
import { loadVoiceSearchContext, type VoiceSearchContext } from "@/lib/voice/searchContext";
import { parseWaterMl, searchForEntity } from "@/lib/voice/semanticSearch";
import { tierFromConfidence } from "@/lib/voice/fuzzyMatch";
import type { MatchCandidate } from "@/lib/voice/types";
import type { MealType } from "@/types/meal-template";
import type {
  ExtractedEntity,
  VoiceDraftItem,
  VoiceProcessResult,
} from "@/lib/voice/types";

function resolveMealType(
  entity: ExtractedEntity,
  utteranceMealType: MealType | undefined,
  transcriptMealType: MealType | undefined,
): MealType {
  return (
    parseMealType(entity.mealType) ??
    utteranceMealType ??
    detectMealTypeFromText(entity.raw) ??
    transcriptMealType ??
    detectMealTypeFromTime()
  );
}

function draftId(): string {
  return `draft_${crypto.randomUUID().slice(0, 8)}`;
}

function isMealTemplateMatch(match: MatchCandidate): boolean {
  return match.source === "meal_template" || match.source === "memory";
}

async function entityToDraft(
  userId: string,
  entity: ExtractedEntity,
  utteranceMealType: MealType | undefined,
  transcriptMealType: MealType | undefined,
  apiKey: string,
  searchCtx: VoiceSearchContext,
): Promise<VoiceDraftItem | null> {
  const intent = entity.intent === "supplement" ? "food" : entity.intent;

  if (intent === "hydration") {
    const ml = entity.amountMl ?? parseWaterMl(entity.raw) ?? 250;
    const confidence = entity.amountMl ? 95 : 80;
    return {
      id: draftId(),
      intent: "hydration",
      label: `Water +${ml} ml`,
      raw: entity.raw,
      confidence,
      status: tierFromConfidence(confidence) === "auto" ? "auto" : "suggest",
      payload: { kind: "hydration", addMl: ml },
    };
  }

  if (intent === "weight") {
    const weightKg = entity.weightKg ?? parseWeightKg(entity.raw);
    if (!weightKg) return null;
    return {
      id: draftId(),
      intent: "weight",
      label: `Weight ${weightKg} kg`,
      raw: entity.raw,
      confidence: entity.weightKg ? 90 : 80,
      status: "auto",
      payload: { kind: "weight", weightKg },
    };
  }

  if (intent === "cardio" || intent === "workout") {
    const searchText = stripSpeechFillers(entity.raw) || entity.raw;
    const cardioHint = detectCardioKeyword(searchText);
    const searchIntent = intent === "cardio" || cardioHint ? "cardio" : "workout";
    const search = await searchForEntity(userId, searchText, searchIntent, { ctx: searchCtx });
    const duration = entity.durationMinutes;

    let match = search.best;
    if (cardioHint) {
      const cardioMatch =
        search.candidates.find((c) => {
          const t = c.meta?.template as { cardioType?: string } | undefined;
          return t?.cardioType === cardioHint;
        }) ?? search.candidates.find((c) => c.name.toLowerCase().includes(cardioHint));
      if (cardioMatch && (!match || cardioMatch.confidence >= (match.confidence - 5))) {
        match = cardioMatch;
      }
    }

    if (match && match.confidence >= 55) {
      const templateMeta = match.meta?.template as { duration?: number } | undefined;
      const labelDuration = duration ?? templateMeta?.duration;
      const confidence = match.confidence;
      return {
        id: draftId(),
        intent: searchIntent === "cardio" ? "cardio" : "workout",
        label: labelDuration ? `${match.name} · ${labelDuration} min` : match.name,
        raw: entity.raw,
        confidence,
        status: tierFromConfidence(confidence) === "auto" ? "auto" : tierFromConfidence(confidence) === "suggest" ? "suggest" : "ask",
        selectedMatch: match,
        alternatives: search.candidates.filter((c) => c.id !== match!.id),
        payload: {
          kind: "workout_template",
          templateId: match.id,
          ...(duration !== undefined ? { duration } : {}),
        },
      };
    }

    return null;
  }

  if (intent === "food") {
    const mealType = resolveMealType(entity, utteranceMealType, transcriptMealType);
    const searchText = stripSpeechFillers(stripMealTypePhrases(entity.raw) || entity.raw) || entity.raw;
    const search = await searchForEntity(userId, searchText, "food", { mealType, ctx: searchCtx });
    const templateMatch =
      (search.best && isMealTemplateMatch(search.best) ? search.best : null) ??
      search.candidates.find(isMealTemplateMatch) ??
      null;

    if (templateMatch) {
      const tier = tierFromConfidence(templateMatch.confidence);
      return {
        id: draftId(),
        intent: "food",
        label: templateMatch.name,
        raw: entity.raw,
        confidence: templateMatch.confidence,
        status: tier === "auto" ? "auto" : tier === "suggest" ? "suggest" : "ask",
        selectedMatch: templateMatch,
        alternatives: search.candidates.filter((c) => c.id !== templateMatch.id),
        payload: {
          kind: "meal_template",
          templateId: templateMatch.id,
          servings: entity.quantity ?? 1,
          mealType,
        },
      };
    }

    const foodMatch = search.best?.source === "food" ? search.best : search.candidates.find((c) => c.source === "food");
    if (foodMatch) {
      const tier = tierFromConfidence(foodMatch.confidence);
      return {
        id: draftId(),
        intent: "food",
        label: foodMatch.name,
        raw: entity.raw,
        confidence: foodMatch.confidence,
        status: tier === "auto" ? "auto" : tier === "suggest" ? "suggest" : "ask",
        selectedMatch: foodMatch,
        alternatives: search.candidates.filter((c) => c.id !== foodMatch.id),
        payload: {
          kind: "meal_food",
          foodId: foodMatch.id,
          multiplier: entity.quantity ?? 1,
          mealType,
        },
      };
    }

    const macros = await estimateFoodMacros(apiKey, searchText, userId);
    if (macros.calories <= 0) return null;

    return {
      id: draftId(),
      intent: "food",
      label: searchText,
      raw: entity.raw,
      confidence: 40,
      status: "ask",
      alternatives: search.candidates,
      payload: {
        kind: "meal_macros",
        name: searchText,
        ...macros,
        mealType,
      },
    };
  }

  return null;
}

export async function processVoiceTranscript(
  apiKey: string,
  userId: string,
  transcript: string,
  searchCtx?: VoiceSearchContext,
): Promise<VoiceProcessResult> {
  const trimmed = transcript.trim();
  if (!trimmed) {
    return { transcript: "", items: [], stage: "error" };
  }

  const ctx = searchCtx ?? (await loadVoiceSearchContext(userId));

  const nlp = await extractFromTranscript(apiKey, trimmed, userId);
  const utteranceMealType = parseMealType(nlp.mealType);
  const transcriptMealType = detectMealTypeFromText(trimmed);

  if (nlp.isCorrection && nlp.correctionText) {
    return {
      transcript: trimmed,
      items: [
        {
          id: draftId(),
          intent: "correction",
          label: nlp.correctionText,
          raw: nlp.correctionText,
          confidence: 85,
          status: "suggest",
          payload: {
            kind: "correction",
            action: { type: "remove", targetLabel: nlp.correctionText },
          },
        },
      ],
      stage: "confirming",
    };
  }

  if (nlp.queryText || (nlp.intents.length === 1 && nlp.intents[0] === "query")) {
    return {
      transcript: trimmed,
      items: [],
      queryReply: undefined,
      stage: "confirming",
    };
  }

  const draftResults = await Promise.all(
    nlp.entities.map((entity) =>
      entityToDraft(userId, entity, utteranceMealType, transcriptMealType, apiKey, ctx),
    ),
  );
  const drafts = draftResults.filter((d): d is VoiceDraftItem => d !== null);

  const allAuto = drafts.length > 0 && drafts.every((d) => d.status === "auto");
  return {
    transcript: trimmed,
    items: drafts,
    stage: allAuto ? "confirming" : "confirming",
  };
}
