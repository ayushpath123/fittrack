import { geminiGenerateJson } from "@/lib/voice/gemini";
import {
  buildNlpExtraction,
  structuredLogsToEntities,
  type StructuredNlpResponse,
  type StructuredVoiceLog,
} from "@/lib/voice/nlpSchema";
import { parseWeightKg } from "@/lib/voice/normalizeSpeech";
import { parseWaterMl } from "@/lib/voice/semanticSearch";
import type { ExtractedEntity, NlpExtraction, VoiceIntent } from "@/lib/voice/types";

const SYSTEM_PROMPT = `You are a fitness logging NLP engine for an Indian fitness app (FitTrack).
Parse voice transcripts (English, Hinglish, or mixed) into a STRUCTURED list of logs to save.

Each utterance may contain MULTIPLE logs across different categories in one breath.
Always return every distinct item the user wants to log.

LOG TYPES (use exactly these "type" values):
1. meal      — food, snacks, supplements, meal templates
2. hydration — water, pani, paani, juices counted as water
3. workout   — gym sessions, strength training, cardio (walk/run/cycle/treadmill)
4. weight    — body weight in kg

OUTPUT JSON SCHEMA (strict):
{
  "logs": [
    { "type": "meal", "name": "protein oats bowl", "mealType": "breakfast", "quantity": 1 },
    { "type": "hydration", "amountMl": 1000, "description": "1 litre water" },
    { "type": "workout", "activity": "walking", "category": "cardio", "durationMinutes": 30 },
    { "type": "weight", "weightKg": 72.5 }
  ],
  "mealType": "breakfast",
  "isCorrection": false,
  "correctionText": null,
  "queryText": null
}

FIELD RULES:
- logs: REQUIRED array. One object per loggable item. Never merge unrelated items.
- meal.name: food name ONLY — no filler verbs (ate, khaya, kiya, log, had).
- meal.mealType: breakfast | lunch | dinner | snack (or null). Top-level mealType applies to all meals unless overridden per item.
- meal.quantity: servings/portions when mentioned (default 1).
- hydration.amountMl: integer ml. 1 litre=1000, 1 glass=250, half litre=500. Guess 250 if only "pani/water" mentioned.
- hydration.description: short label e.g. "2 glasses water".
- workout.activity: activity name ONLY — strip kiya/kar diya/done. e.g. "walking kiya" → activity "walking".
- workout.category: "cardio" for walk/run/cycle/treadmill/swim; "strength" for gym/chest/legs/push/pull.
- workout.durationMinutes: only when user says duration (30 min, half hour).
- weight.weightKg: REQUIRED number in kg for weight logs. Convert if user says lbs.
- isCorrection/queryText: only for corrections or questions, not normal logging.

HINGLISH:
- khaya/liya/piya = meal or hydration context from the noun
- kiya/kar diya = completed workout — strip from activity name
- pani/paani = hydration
- nashta=breakfast, dopahar=lunch, shaam/raat=dinner

MULTI-INTENT EXAMPLES:

Input: "subah protein oats bowl khaya, 1 litre pani piya, walking kiya 30 minute, weight 72.5 kg"
Output logs: [
  { "type": "meal", "name": "protein oats bowl", "mealType": "breakfast" },
  { "type": "hydration", "amountMl": 1000, "description": "1 litre water" },
  { "type": "workout", "activity": "walking", "category": "cardio", "durationMinutes": 30 },
  { "type": "weight", "weightKg": 72.5 }
]

Input: "log dinner chicken biryani and dal, chest workout 45 min"
Output logs: [
  { "type": "meal", "name": "chicken biryani and dal", "mealType": "dinner" },
  { "type": "workout", "activity": "chest workout", "category": "strength", "durationMinutes": 45 }
]

Input: "how much protein left today"
Output: { "logs": [], "queryText": "how much protein left today" }

Return ONLY valid JSON matching the schema.`;

type LegacyEntity = {
  raw?: string;
  intent?: string;
  quantity?: number;
  unit?: string;
  durationMinutes?: number;
  amountMl?: number;
  weightKg?: number;
  mealType?: string | null;
};

type RawNlpResponse = StructuredNlpResponse & {
  intents?: string[];
  entities?: LegacyEntity[];
};

const VALID_INTENTS = new Set<VoiceIntent>([
  "food",
  "workout",
  "cardio",
  "hydration",
  "supplement",
  "weight",
  "query",
  "correction",
]);

function normalizeIntent(raw: string | undefined): VoiceIntent {
  const key = (raw ?? "food").toLowerCase() as VoiceIntent;
  return VALID_INTENTS.has(key) ? key : "food";
}

function isStructuredLog(value: unknown): value is StructuredVoiceLog {
  if (!value || typeof value !== "object") return false;
  const t = (value as { type?: string }).type;
  return t === "meal" || t === "hydration" || t === "workout" || t === "weight";
}

function legacyEntitiesToStructured(entities: LegacyEntity[]): StructuredVoiceLog[] {
  const logs: StructuredVoiceLog[] = [];
  for (const e of entities) {
    if (!e.raw?.trim()) continue;
    const intent = normalizeIntent(e.intent);
    if (intent === "food" || intent === "supplement") {
      logs.push({
        type: "meal",
        name: e.raw.trim(),
        mealType: e.mealType,
        quantity: e.quantity,
      });
    } else if (intent === "hydration") {
      logs.push({
        type: "hydration",
        amountMl: e.amountMl,
        description: e.raw.trim(),
      });
    } else if (intent === "workout" || intent === "cardio") {
      logs.push({
        type: "workout",
        activity: e.raw.trim(),
        category: intent === "cardio" ? "cardio" : "strength",
        durationMinutes: e.durationMinutes,
      });
    } else if (intent === "weight") {
      const kg = e.weightKg ?? parseWeightKg(e.raw);
      if (kg) logs.push({ type: "weight", weightKg: kg });
    }
  }
  return logs;
}

function resolveLogs(raw: RawNlpResponse): StructuredVoiceLog[] {
  const fromLogs = (raw.logs ?? []).filter(isStructuredLog);
  if (fromLogs.length > 0) return fromLogs;
  if (raw.entities?.length) return legacyEntitiesToStructured(raw.entities);
  return [];
}

export async function extractFromTranscript(
  apiKey: string,
  transcript: string,
  userId?: string,
): Promise<NlpExtraction> {
  const raw = await geminiGenerateJson<RawNlpResponse>(
    apiKey,
    SYSTEM_PROMPT,
    `Transcript: "${transcript}"`,
    { purpose: "voice_nlp", userId, maxTokens: 1400 },
  );

  if (raw.isCorrection && raw.correctionText) {
    return buildNlpExtraction([], {
      isCorrection: true,
      correctionText: raw.correctionText,
    });
  }

  if (raw.queryText?.trim()) {
    return buildNlpExtraction([], { queryText: raw.queryText.trim() });
  }

  let logs = resolveLogs(raw);

  if (logs.length === 0 && transcript.trim().length > 2) {
    logs = [{ type: "meal", name: transcript.trim() }];
  }

  const extraction = buildNlpExtraction(logs, {
    mealType: raw.mealType ?? undefined,
    isCorrection: false,
    queryText: undefined,
  });

  return enrichEntities(extraction, transcript);
}

/** Client-side fallbacks when the LLM omits numeric fields. */
function enrichEntities(extraction: NlpExtraction, transcript: string): NlpExtraction {
  const entities: ExtractedEntity[] = extraction.entities.map((e) => {
    if (e.intent === "weight" && !e.weightKg) {
      const kg = parseWeightKg(e.raw) ?? parseWeightKg(transcript);
      if (kg) return { ...e, weightKg: kg };
    }
    if (e.intent === "hydration" && !e.amountMl) {
      const ml = parseWaterMl(e.raw) ?? parseWaterMl(transcript);
      if (ml) return { ...e, amountMl: ml };
    }
    return e;
  });

  const weightFromTranscript = parseWeightKg(transcript);
  const hasWeight = entities.some((e) => e.intent === "weight" && e.weightKg);
  if (!hasWeight && weightFromTranscript) {
    entities.push({
      raw: `weight ${weightFromTranscript} kg`,
      intent: "weight",
      weightKg: weightFromTranscript,
    });
  }

  const intents = entities
    .map((e) => e.intent)
    .filter((i, idx, arr) => arr.indexOf(i) === idx);

  return { ...extraction, entities, intents };
}

export { structuredLogsToEntities };
