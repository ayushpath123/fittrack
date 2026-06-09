import { describe, expect, it } from "vitest";
import { buildNlpExtraction, structuredLogsToEntities } from "@/lib/voice/nlpSchema";
import { parseWeightKg } from "@/lib/voice/normalizeSpeech";

describe("structuredLogsToEntities", () => {
  it("maps multi-intent logs to entities", () => {
    const entities = structuredLogsToEntities(
      [
        { type: "meal", name: "protein oats bowl", mealType: "breakfast" },
        { type: "hydration", amountMl: 1000, description: "1 litre water" },
        { type: "workout", activity: "walking", category: "cardio", durationMinutes: 30 },
        { type: "weight", weightKg: 72.5 },
      ],
      "breakfast",
    );

    expect(entities).toHaveLength(4);
    expect(entities[0]).toMatchObject({ intent: "food", raw: "protein oats bowl", mealType: "breakfast" });
    expect(entities[1]).toMatchObject({ intent: "hydration", amountMl: 1000 });
    expect(entities[2]).toMatchObject({ intent: "cardio", raw: "walking", durationMinutes: 30 });
    expect(entities[3]).toMatchObject({ intent: "weight", weightKg: 72.5 });
  });

  it("classifies strength workout", () => {
    const entities = structuredLogsToEntities([
      { type: "workout", activity: "chest workout", category: "strength", durationMinutes: 45 },
    ]);
    expect(entities[0]?.intent).toBe("workout");
  });
});

describe("buildNlpExtraction", () => {
  it("collects unique intents", () => {
    const result = buildNlpExtraction(
      [
        { type: "meal", name: "apple" },
        { type: "hydration", amountMl: 250 },
        { type: "workout", activity: "running", category: "cardio" },
        { type: "weight", weightKg: 70 },
      ],
      {},
    );
    expect(result.intents).toEqual(expect.arrayContaining(["food", "hydration", "cardio", "weight"]));
    expect(result.entities).toHaveLength(4);
  });
});

describe("parseWeightKg", () => {
  it("parses kg", () => {
    expect(parseWeightKg("weight 72.5 kg")).toBe(72.5);
  });

  it("parses wazan", () => {
    expect(parseWeightKg("aaj wazan 68")).toBe(68);
  });
});
