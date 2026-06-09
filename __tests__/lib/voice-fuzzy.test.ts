import { describe, expect, it } from "vitest";
import { detectMealTypeFromText, stripMealTypePhrases } from "@/lib/meal-templates";
import { fuzzyScore, tierFromConfidence } from "@/lib/voice/fuzzyMatch";
import {
  detectCardioKeyword,
  queryTokenCoverage,
  stripSpeechFillers,
} from "@/lib/voice/normalizeSpeech";
import { parseWaterMl } from "@/lib/voice/semanticSearch";

describe("fuzzyScore", () => {
  it("scores exact matches at 1", () => {
    expect(fuzzyScore("protein oats bowl", "protein oats bowl")).toBe(1);
  });

  it("handles transcription errors", () => {
    const score = fuzzyScore("protin ots bowl", "protein oats bowl");
    expect(score).toBeGreaterThan(0.5);
  });

  it("matches partial names", () => {
    const score = fuzzyScore("oats bowl", "high protein oats bowl");
    expect(score).toBeGreaterThan(0.85);
  });
});

describe("tierFromConfidence", () => {
  it("auto-accepts above 85", () => {
    expect(tierFromConfidence(96)).toBe("auto");
  });

  it("suggests between 60 and 85", () => {
    expect(tierFromConfidence(72)).toBe("suggest");
  });

  it("asks below 60", () => {
    expect(tierFromConfidence(45)).toBe("ask");
  });
});

describe("parseWaterMl", () => {
  it("parses litres", () => {
    expect(parseWaterMl("drank one litre water")).toBe(1000);
    expect(parseWaterMl("1 litre water")).toBe(1000);
  });

  it("parses glasses", () => {
    expect(parseWaterMl("2 glasses water")).toBe(500);
  });

  it("defaults water mention to 250ml", () => {
    expect(parseWaterMl("drank water")).toBe(250);
  });
});

describe("detectMealTypeFromText", () => {
  it("detects dinner from English", () => {
    expect(detectMealTypeFromText("log my dinner chicken curry and rice")).toBe("dinner");
  });

  it("detects breakfast from Hinglish", () => {
    expect(detectMealTypeFromText("subah ka nashta oats")).toBe("breakfast");
  });

  it("detects lunch", () => {
    expect(detectMealTypeFromText("for lunch dal rice")).toBe("lunch");
  });

  it("returns undefined when no slot mentioned", () => {
    expect(detectMealTypeFromText("two eggs and toast")).toBeUndefined();
  });
});

describe("stripMealTypePhrases", () => {
  it("removes dinner from search text", () => {
    expect(stripMealTypePhrases("log dinner chicken biryani")).toBe("log chicken biryani");
  });
});

describe("stripSpeechFillers", () => {
  it("removes Hinglish verb kiya", () => {
    expect(stripSpeechFillers("walking kiya")).toBe("walking");
  });

  it("removes ate from food phrase", () => {
    expect(stripSpeechFillers("i ate protein oats bowl")).toBe("protein oats bowl");
  });
});

describe("queryTokenCoverage", () => {
  it("prefers protein oats bowl over rice bowl", () => {
    const query = "protein oats bowl";
    expect(queryTokenCoverage(query, "Protein Oats Bowl")).toBe(1);
    expect(queryTokenCoverage(query, "Rice Bowl")).toBe(0);
  });

  it("matches oat to oats stem", () => {
    expect(queryTokenCoverage("oat bowl", "Protein Oats Bowl")).toBe(1);
  });
});

describe("detectCardioKeyword", () => {
  it("detects walking after filler strip", () => {
    expect(detectCardioKeyword(stripSpeechFillers("walking kiya"))).toBe("walking");
  });
});
