import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { hasProAccess, proRequiredResponse } from "@/lib/billing";
import { checkAiRateLimit } from "@/lib/ai/rateLimit";
import { aiLog } from "@/lib/ai/log";

export const dynamic = "force-dynamic";

function extractJsonObject(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });
    if (!user || !hasProAccess(user)) {
      return proRequiredResponse();
    }

    const rl = checkAiRateLimit(userId, "estimate_meal");
    if (!rl.ok) {
      return NextResponse.json({ error: "RATE_LIMIT", retryAfterSec: rl.retryAfterSec }, { status: 429 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not configured." }, { status: 500 });
    }

    const form = await req.formData();
    const image = form.get("image");
    const descriptionInput = form.get("description");
    const description = typeof descriptionInput === "string" ? descriptionInput.trim().slice(0, 400) : "";
    if (!(image instanceof File)) {
      return NextResponse.json({ error: "Image file is required." }, { status: 400 });
    }

    const arr = await image.arrayBuffer();
    const base64 = Buffer.from(arr).toString("base64");
    const mimeType = image.type || "image/jpeg";

    const prompt = [
      "You are a nutrition assistant.",
      "Estimate total nutrition for the food shown in this single image.",
      "Return ONLY a JSON object with numeric fields:",
      "{",
      '  "calories": number,',
      '  "protein": number,',
      '  "carbs": number,',
      '  "fat": number,',
      '  "confidence": number',
      "}",
      "Rules:",
      "- confidence is 0 to 1",
      "- no markdown, no code fences, no extra text",
      description ? `User description/context: ${description}` : "",
    ].join("\n");

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64 } }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          topP: 0.9,
          maxOutputTokens: 300,
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return NextResponse.json({ error: `Gemini request failed: ${errText}` }, { status: 502 });
    }

    const data = (await geminiRes.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };

    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("\n") ?? "";
    const json = extractJsonObject(text);
    if (!json) {
      return NextResponse.json({ error: "Could not parse Gemini response.", raw: text }, { status: 502 });
    }

    const calories = Number(json.calories);
    const protein = Number(json.protein);
    const carbs = Number(json.carbs);
    const fat = Number(json.fat);
    const confidence = Number(json.confidence);

    if (![calories, protein, carbs, fat].every(Number.isFinite)) {
      return NextResponse.json({ error: "Gemini returned invalid nutrition values.", raw: text }, { status: 502 });
    }

    const normalized = {
      calories: Math.max(0, Math.round(calories)),
      protein: Math.max(0, Math.round(protein)),
      carbs: Math.max(0, Math.round(carbs)),
      fat: Math.max(0, Math.round(fat)),
      confidence: Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0.6,
    };

    const estimate = await prisma.mealEstimate.create({
      data: {
        userId,
        calories: normalized.calories,
        protein: normalized.protein,
        carbs: normalized.carbs,
        fat: normalized.fat,
        confidence: normalized.confidence,
        status: "draft",
        source: "camera",
        imageName: image.name || null,
        imageMimeType: mimeType,
      },
    });

    aiLog("estimate_meal_completed", { userId, estimateId: estimate.id });
    return NextResponse.json({ ...normalized, estimateId: estimate.id });
  } catch {
    return NextResponse.json({ error: "Unable to estimate meal from image." }, { status: 500 });
  }
}
