import { normalizeForMatch } from "@/lib/voice/fuzzyMatch";

/** Hinglish / filler words that should not affect food or workout matching. */
const SPEECH_FILLERS = new Set([
  "i",
  "me",
  "my",
  "the",
  "a",
  "an",
  "and",
  "with",
  "for",
  "some",
  "just",
  "also",
  "today",
  "ate",
  "eat",
  "eating",
  "had",
  "have",
  "log",
  "logged",
  "add",
  "done",
  "kiya",
  "kiya hai",
  "khaya",
  "khaya hai",
  "khayi",
  "liya",
  "liya hai",
  "piya",
  "piya hai",
  "kar",
  "kari",
  "kiya tha",
  "hai",
  "tha",
  "thi",
]);

/** Generic food words — poor alone for template disambiguation. */
const WEAK_FOOD_TOKENS = new Set(["bowl", "plate", "meal", "food", "item", "serving", "cup"]);

const FILLER_PHRASES = [
  "i ate",
  "i had",
  "i eat",
  "log my",
  "please log",
  "kiya hai",
  "khaya hai",
  "liya hai",
];

export function stripSpeechFillers(text: string): string {
  let result = text.trim();
  for (const phrase of FILLER_PHRASES) {
    const re = new RegExp(`\\b${phrase.replace(/\s+/g, "\\s+")}\\b`, "gi");
    result = result.replace(re, " ");
  }

  const tokens = normalizeForMatch(result)
    .split(" ")
    .filter((t) => t && !SPEECH_FILLERS.has(t));

  return tokens.join(" ").trim();
}

export function significantTokens(text: string): string[] {
  return normalizeForMatch(text)
    .split(" ")
    .filter((t) => t.length > 2 && !SPEECH_FILLERS.has(t) && !WEAK_FOOD_TOKENS.has(t));
}

function tokenInCandidate(token: string, cNorm: string): boolean {
  if (cNorm.includes(token)) return true;
  const words = cNorm.split(/\s+/).filter(Boolean);
  return words.some((w) => {
    if (w === token) return true;
    if (token.length >= 3 && w.length >= 3) {
      return w.startsWith(token) || token.startsWith(w);
    }
    return false;
  });
}

/** Share of meaningful query tokens found in the candidate name. */
export function queryTokenCoverage(query: string, candidate: string): number {
  const qTokens = significantTokens(query);
  if (qTokens.length === 0) return 0;
  const cNorm = normalizeForMatch(candidate);
  const hits = qTokens.filter((t) => tokenInCandidate(t, cNorm)).length;
  return hits / qTokens.length;
}

/** Parse body weight from spoken text (kg). */
export function parseWeightKg(text: string): number | undefined {
  const lower = text.toLowerCase();
  const kgMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:kg|kgs|kilos?|kilograms?)\b/);
  if (kgMatch) {
    const n = parseFloat(kgMatch[1]!);
    return Number.isFinite(n) && n > 0 && n < 500 ? n : undefined;
  }
  const lbMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?)\b/);
  if (lbMatch) {
    const lbs = parseFloat(lbMatch[1]!);
    if (!Number.isFinite(lbs) || lbs <= 0) return undefined;
    return Math.round((lbs * 0.453592) * 10) / 10;
  }
  if (/\bweight\b/.test(lower) || /\bwazan\b/.test(lower) || /\btaul\b/.test(lower)) {
    const numMatch = lower.match(/(\d+(?:\.\d+)?)/);
    if (numMatch) {
      const n = parseFloat(numMatch[1]!);
      return Number.isFinite(n) && n > 0 && n < 500 ? n : undefined;
    }
  }
  return undefined;
}

/** Detect cardio activity keyword for routing (walking, running, …). */
export function detectCardioKeyword(text: string): string | undefined {
  const lower = normalizeForMatch(text);
  const rules: Array<{ keyword: string; terms: string[] }> = [
    { keyword: "walking", terms: ["walking", "walk", "walked", "chala", "chalna", "tahla"] },
    { keyword: "running", terms: ["running", "run", "ran", "jog", "jogging", "daud"] },
    { keyword: "cycling", terms: ["cycling", "cycle", "bike", "biking"] },
    { keyword: "treadmill", terms: ["treadmill"] },
    { keyword: "cardio", terms: ["cardio"] },
  ];
  for (const { keyword, terms } of rules) {
    if (terms.some((t) => lower.includes(t))) return keyword;
  }
  return undefined;
}
