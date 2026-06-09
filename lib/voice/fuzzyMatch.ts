/** Normalize text for fuzzy comparison (handles Hinglish transliteration quirks). */
export function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Levenshtein distance between two strings. */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i);

  for (let i = 1; i <= m; i++) {
    let prev = dp[0]!;
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j]!;
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j]! + 1, dp[j - 1]! + 1, prev + cost);
      prev = temp;
    }
  }
  return dp[n]!;
}

/** Token overlap ratio (Jaccard-like on word tokens). */
export function tokenOverlapScore(a: string, b: string): number {
  const tokensA = new Set(normalizeForMatch(a).split(" ").filter(Boolean));
  const tokensB = new Set(normalizeForMatch(b).split(" ").filter(Boolean));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }
  const union = new Set([...tokensA, ...tokensB]).size;
  return union > 0 ? intersection / union : 0;
}

/** Combined fuzzy score 0–1 between query and candidate name. */
export function fuzzyScore(query: string, candidate: string): number {
  const q = normalizeForMatch(query);
  const c = normalizeForMatch(candidate);
  if (!q || !c) return 0;
  if (q === c) return 1;
  if (c.includes(q) || q.includes(c)) return 0.92;

  const maxLen = Math.max(q.length, c.length);
  const editDist = levenshtein(q, c);
  const editScore = maxLen > 0 ? 1 - editDist / maxLen : 0;
  const tokenScore = tokenOverlapScore(q, c);

  return Math.min(1, editScore * 0.55 + tokenScore * 0.45);
}

export function confidenceFromScore(score: number, useCountBoost = 0): number {
  const boosted = Math.min(1, score + useCountBoost);
  return Math.round(boosted * 100);
}

export type ConfidenceTier = "auto" | "suggest" | "ask";

export function tierFromConfidence(confidence: number): ConfidenceTier {
  if (confidence >= 85) return "auto";
  if (confidence >= 60) return "suggest";
  return "ask";
}
