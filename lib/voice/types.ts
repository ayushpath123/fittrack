export type VoiceIntent =
  | "food"
  | "workout"
  | "cardio"
  | "hydration"
  | "supplement"
  | "weight"
  | "query"
  | "correction";

export type VoiceProcessingStage =
  | "idle"
  | "listening"
  | "understanding"
  | "matching"
  | "confirming"
  | "logging"
  | "done"
  | "error";

export type ExtractedEntity = {
  raw: string;
  intent: VoiceIntent;
  quantity?: number;
  unit?: string;
  durationMinutes?: number;
  amountMl?: number;
  weightKg?: number;
  /** breakfast | lunch | dinner | snack when user specifies a meal slot */
  mealType?: string;
};

export type MatchCandidate = {
  id: string;
  name: string;
  confidence: number;
  source: "meal_template" | "food" | "workout_template" | "cardio" | "memory";
  meta?: Record<string, unknown>;
};

export type VoiceDraftItem = {
  id: string;
  intent: VoiceIntent;
  label: string;
  raw: string;
  confidence: number;
  status: "auto" | "suggest" | "ask";
  selectedMatch?: MatchCandidate;
  alternatives?: MatchCandidate[];
  /** Resolved payload for logging */
  payload: VoiceLogPayload;
};

export type VoiceLogPayload =
  | { kind: "meal_template"; templateId: string; servings?: number; mealType?: string }
  | { kind: "meal_food"; foodId: string; multiplier?: number; grams?: number; mealType?: string }
  | { kind: "meal_macros"; name: string; calories: number; protein: number; carbs: number; fat: number; mealType?: string }
  | { kind: "workout_template"; templateId: string; duration?: number }
  | { kind: "cardio"; name: string; durationMinutes: number; caloriesBurned?: number }
  | { kind: "hydration"; addMl: number }
  | { kind: "weight"; weightKg: number; waistCm?: number }
  | { kind: "query"; question: string }
  | { kind: "correction"; action: CorrectionAction };

export type CorrectionAction =
  | { type: "remove"; targetLabel: string }
  | { type: "replace"; targetLabel: string; replacement: string }
  | { type: "update_hydration"; amountMl: number };

export type VoiceProcessResult = {
  transcript: string;
  items: VoiceDraftItem[];
  queryReply?: string;
  stage: VoiceProcessingStage;
};

export type VoiceConfirmItem = {
  draftId: string;
  payload: VoiceLogPayload;
  /** Override match when user picks an alternative */
  matchId?: string;
};

export type VoiceConfirmResult = {
  logged: Array<{ draftId: string; label: string; success: boolean; error?: string }>;
  nutrition?: { calories: number; protein: number; carbs: number; fat: number };
  hydrationMl?: number;
};

export type NlpExtraction = {
  intents: VoiceIntent[];
  entities: ExtractedEntity[];
  /** Default meal slot for food entities in this utterance */
  mealType?: string;
  isCorrection: boolean;
  correctionText?: string;
  queryText?: string;
};
