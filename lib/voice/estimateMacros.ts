import { geminiGenerateJson } from "@/lib/voice/gemini";

type MacroEstimate = {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
};

const SYSTEM_PROMPT = `Estimate nutrition for a single food item or small meal the user spoke.
Return realistic Indian / home-cooking portions. JSON only:
{ "calories": number, "protein": number, "carbs": number, "fat": number }`;

export async function estimateFoodMacros(
  apiKey: string,
  foodName: string,
  userId?: string,
): Promise<{ calories: number; protein: number; carbs: number; fat: number }> {
  try {
    const raw = await geminiGenerateJson<MacroEstimate>(
      apiKey,
      SYSTEM_PROMPT,
      `Food: "${foodName}"`,
      { purpose: "voice_macro_estimate", userId, maxTokens: 200 },
    );
    return {
      calories: Math.max(0, Math.round(raw.calories ?? 0)),
      protein: Math.max(0, Math.round((raw.protein ?? 0) * 10) / 10),
      carbs: Math.max(0, Math.round((raw.carbs ?? 0) * 10) / 10),
      fat: Math.max(0, Math.round((raw.fat ?? 0) * 10) / 10),
    };
  } catch {
    return { calories: 0, protein: 0, carbs: 0, fat: 0 };
  }
}
