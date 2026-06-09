import { parseWaterMl } from "@/lib/voice/semanticSearch";
import { parseWeightKg, stripSpeechFillers } from "@/lib/voice/normalizeSpeech";
import type { ExtractedEntity, NlpExtraction, VoiceIntent } from "@/lib/voice/types";

/** Structured log entry returned by the LLM — one item per thing to save. */
export type StructuredMealLog = {
  type: "meal";
  name: string;
  mealType?: string | null;
  quantity?: number | null;
};

export type StructuredHydrationLog = {
  type: "hydration";
  amountMl?: number | null;
  description?: string | null;
};

export type StructuredWorkoutLog = {
  type: "workout";
  activity: string;
  category?: "cardio" | "strength" | null;
  durationMinutes?: number | null;
};

export type StructuredWeightLog = {
  type: "weight";
  weightKg: number;
  waistCm?: number | null;
};

export type StructuredVoiceLog =
  | StructuredMealLog
  | StructuredHydrationLog
  | StructuredWorkoutLog
  | StructuredWeightLog;

export type StructuredNlpResponse = {
  logs?: StructuredVoiceLog[];
  mealType?: string | null;
  isCorrection?: boolean;
  correctionText?: string | null;
  queryText?: string | null;
};

const CARDIO_ACTIVITIES = new Set([
  "walk",
  "walking",
  "run",
  "running",
  "jog",
  "jogging",
  "cycle",
  "cycling",
  "treadmill",
  "cardio",
  "swim",
  "swimming",
  "row",
  "rowing",
  "elliptical",
  "stair",
]);

function isCardioActivity(activity: string, category?: string | null): boolean {
  if (category === "cardio") return true;
  const lower = activity.toLowerCase();
  return [...CARDIO_ACTIVITIES].some((k) => lower.includes(k));
}

function mealLogToEntity(log: StructuredMealLog, defaultMealType?: string): ExtractedEntity {
  const name = stripSpeechFillers(log.name) || log.name.trim();
  return {
    raw: name,
    intent: "food",
    quantity: log.quantity ?? undefined,
    mealType: log.mealType?.trim() || defaultMealType || undefined,
  };
}

function hydrationLogToEntity(log: StructuredHydrationLog): ExtractedEntity {
  const description = log.description?.trim() || "water";
  const amountMl = log.amountMl ?? parseWaterMl(description) ?? undefined;
  return {
    raw: description,
    intent: "hydration",
    amountMl,
  };
}

function workoutLogToEntity(log: StructuredWorkoutLog): ExtractedEntity {
  const activity = stripSpeechFillers(log.activity) || log.activity.trim();
  const intent: VoiceIntent = isCardioActivity(activity, log.category) ? "cardio" : "workout";
  return {
    raw: activity,
    intent,
    durationMinutes: log.durationMinutes ?? undefined,
  };
}

function weightLogToEntity(log: StructuredWeightLog): ExtractedEntity {
  return {
    raw: `weight ${log.weightKg} kg`,
    intent: "weight",
    weightKg: log.weightKg,
  };
}

export function structuredLogsToEntities(
  logs: StructuredVoiceLog[],
  defaultMealType?: string,
): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];

  for (const log of logs) {
    switch (log.type) {
      case "meal": {
        if (!log.name?.trim()) continue;
        entities.push(mealLogToEntity(log, defaultMealType));
        break;
      }
      case "hydration":
        entities.push(hydrationLogToEntity(log));
        break;
      case "workout": {
        if (!log.activity?.trim()) continue;
        entities.push(workoutLogToEntity(log));
        break;
      }
      case "weight": {
        const kg = log.weightKg ?? parseWeightKg(`weight ${log.weightKg}`);
        if (kg == null || kg <= 0) continue;
        entities.push(weightLogToEntity({ ...log, weightKg: kg }));
        break;
      }
    }
  }

  return entities;
}

export function buildNlpExtraction(
  logs: StructuredVoiceLog[],
  opts: {
    mealType?: string;
    isCorrection?: boolean;
    correctionText?: string;
    queryText?: string;
  },
): NlpExtraction {
  const defaultMealType = opts.mealType?.trim() || undefined;
  const entities = structuredLogsToEntities(logs, defaultMealType);

  const intents = entities
    .map((e) => e.intent)
    .filter((i, idx, arr) => arr.indexOf(i) === idx);

  return {
    intents,
    entities,
    mealType: defaultMealType,
    isCorrection: !!opts.isCorrection,
    correctionText: opts.correctionText ?? undefined,
    queryText: opts.queryText ?? undefined,
  };
}
