export const AI_CONFIG = {
  providerOrder: ["anthropic", "gemini"] as const,
  gemini: {
    defaultModel: "gemini-2.0-flash",
    fallbackModels: ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"],
  },
  anthropic: {
    defaultModel: "claude-sonnet-4-20250514",
  },
  maxTokens: {
    estimation: 700,
    insight: 250,
    nudge: 120,
    coach: 450,
    weeklyReport: 700,
  },
  limits: {
    analyzeMealPerDay: 10,
    coachPerDay: 4,
    coachPerMonth: 30,
    insightPerDay: 8,
    weeklyReportPerDay: 1,
  },
} as const;
