export type CoachHistoryTurn = { role: "user" | "assistant"; content: string };

export type CoachFetchedData = {
  userContext: Record<string, unknown>;
  targets: { calorieTarget: number; proteinTarget: number; waterGoalMl: number };
  today: {
    localDate: string;
    caloriesSoFar: number;
    proteinSoFar: number;
    mealsLogged: number;
    caloriesRemaining: number;
    hydrationMl: number | null;
  };
  rolling7d: {
    daysWithMealsLogged: number;
    totalCalories: number;
    completedWorkouts: number;
  };
  weight: {
    latestKg: number | null;
    priorKg: number | null;
    deltaKg: number | null;
    recent: { date: string; weightKg: number }[];
  };
};

export type CoachToolTraceEntry = {
  name: string;
  args: Record<string, unknown>;
  result: unknown;
};

const GEMINI_MODEL = "gemini-1.5-flash";

type GeminiPart = {
  text?: string;
  functionCall?: { name: string; args?: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
};

type GeminiContent = { role: string; parts: GeminiPart[] };

type GenerateContentResponse = {
  candidates?: Array<{
    content?: GeminiContent;
    finishReason?: string;
  }>;
  error?: { message?: string };
};

function extractJsonObject(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as unknown;
  } catch {
    return null;
  }
}

async function geminiGenerate(apiKey: string, body: Record<string, unknown>) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Gemini non-JSON (${res.status}): ${text.slice(0, 240)}`);
  }
  const data = parsed as GenerateContentResponse & { error?: { message?: string } };
  if (!res.ok) {
    throw new Error(data.error?.message ?? text.slice(0, 300));
  }
  return data;
}

function toolDeclarations() {
  return [
    {
      name: "get_today_nutrition",
      description:
        "Today's calories and protein logged so far vs targets, meals count, hydration vs water goal.",
      parameters: { type: "object", properties: {} },
    },
    {
      name: "get_week_summary",
      description:
        "Rolling last 7 days: distinct days with meals, total calories in window, completed workouts.",
      parameters: { type: "object", properties: {} },
    },
    {
      name: "get_macro_gap",
      description: "Today's calories and protein remaining vs targets.",
      parameters: { type: "object", properties: {} },
    },
    {
      name: "get_weight_trend",
      description: "Recent weight entries newest-first; optional maxEntries 1–10 (default 4).",
      parameters: {
        type: "object",
        properties: {
          maxEntries: { type: "integer" },
        },
      },
    },
    {
      name: "get_workout_progress",
      description: "Completed workouts in last 7 days vs a 3 sessions/week reference.",
      parameters: { type: "object", properties: {} },
    },
  ];
}

function runTool(
  name: string,
  args: Record<string, unknown> | undefined,
  data: CoachFetchedData,
): Record<string, unknown> {
  const a = args ?? {};
  switch (name) {
    case "get_today_nutrition":
      return {
        localDate: data.today.localDate,
        caloriesSoFar: data.today.caloriesSoFar,
        proteinSoFar: data.today.proteinSoFar,
        mealsLoggedToday: data.today.mealsLogged,
        calorieTarget: data.targets.calorieTarget,
        proteinTarget: data.targets.proteinTarget,
        caloriesRemaining: data.today.caloriesRemaining,
        hydrationMlToday: data.today.hydrationMl,
        waterGoalMl: data.targets.waterGoalMl,
      };
    case "get_week_summary":
      return {
        daysWithMealsLogged: data.rolling7d.daysWithMealsLogged,
        totalCalories7d: data.rolling7d.totalCalories,
        completedWorkouts7d: data.rolling7d.completedWorkouts,
      };
    case "get_macro_gap":
      return {
        calorieTarget: data.targets.calorieTarget,
        proteinTarget: data.targets.proteinTarget,
        caloriesSoFar: data.today.caloriesSoFar,
        proteinSoFar: data.today.proteinSoFar,
        caloriesRemaining: data.today.caloriesRemaining,
        proteinRemaining: Math.max(0, data.targets.proteinTarget - data.today.proteinSoFar),
      };
    case "get_weight_trend": {
      const maxRaw = a.maxEntries;
      const maxEntries =
        typeof maxRaw === "number" && Number.isFinite(maxRaw) ? Math.min(10, Math.max(1, Math.floor(maxRaw))) : 4;
      return {
        entries: data.weight.recent.slice(0, maxEntries).map((e) => ({
          date: e.date,
          weightKg: e.weightKg,
        })),
        latestKg: data.weight.latestKg,
        deltaLastTwoKg: data.weight.deltaKg,
      };
    }
    case "get_workout_progress":
      return {
        completedWorkouts7d: data.rolling7d.completedWorkouts,
        weeklySessionTarget: 3,
        remainingToTarget: Math.max(0, 3 - data.rolling7d.completedWorkouts),
      };
    default:
      return { error: "unknown_tool", name };
  }
}

const MAX_TOOL_ROUNDS = 6;

const TOOL_SYSTEM = [
  "You are a fitness coach assistant with callable tools that return real data from this user's account.",
  "Call tools whenever you need accurate numbers about intake, weight, or exercise. Do not guess.",
  "You may call multiple tools across turns until you have enough information.",
  "When you no longer need tools, stop issuing function calls (reply with no tools) for this phase.",
].join(" ");

export async function runCoachWithFunctionCalling(
  apiKey: string,
  message: string,
  history: CoachHistoryTurn[],
  data: CoachFetchedData,
): Promise<{ reply: string; actions: { label: string; href: string }[]; toolTrace: CoachToolTraceEntry[] }> {
  const toolTrace: CoachToolTraceEntry[] = [];

  const historyLines = history
    .slice(-8)
    .map((h) => `${h.role === "user" ? "User" : "Coach"}: ${h.content}`)
    .join("\n");

  const contents: GeminiContent[] = [];
  for (const turn of history.slice(-6)) {
    contents.push({
      role: turn.role === "user" ? "user" : "model",
      parts: [{ text: turn.content }],
    });
  }

  contents.push({
    role: "user",
    parts: [
      {
        text: [
          `Baselines (tools return authoritative detail): ${JSON.stringify(data.userContext)}`,
          "",
          `Recent conversation:\n${historyLines || "(none)"}`,
          "",
          `Current user message:\n${message}`,
        ].join("\n"),
      },
    ],
  });

  let rounds = 0;
  while (rounds < MAX_TOOL_ROUNDS) {
    rounds++;
    const lastData = await geminiGenerate(apiKey, {
      systemInstruction: { parts: [{ text: TOOL_SYSTEM }] },
      contents,
      tools: [{ functionDeclarations: toolDeclarations() }],
      toolConfig: {
        functionCallingConfig: {
          mode: "AUTO",
        },
      },
      generationConfig: {
        temperature: 0.2,
        topP: 0.9,
        maxOutputTokens: 512,
      },
    });

    const parts = lastData.candidates?.[0]?.content?.parts ?? [];
    const callParts = parts.filter((p) => p.functionCall);
    if (callParts.length === 0) {
      break;
    }

    contents.push({
      role: "model",
      parts: callParts,
    });

    const responseParts: GeminiPart[] = callParts.map((p) => {
      const fc = p.functionCall!;
      const args = (fc.args ?? {}) as Record<string, unknown>;
      const result = runTool(fc.name, args, data);
      toolTrace.push({ name: fc.name, args, result });
      return {
        functionResponse: {
          name: fc.name,
          response: result,
        },
      };
    });

    contents.push({
      role: "user",
      parts: responseParts,
    });
  }

  const synthesisUserPrompt = [
    "Produce the coaching response as JSON only. No markdown, no code fences, no extra text outside one JSON object.",
    'Schema: {"reply":"string","actions":[{"label":"short CTA","href":"/path"}]}',
    "Rules:",
    "- At most 3 actions; href starts with / and must be an in-app path.",
    "- Use ONLY information from USER_CONTEXT and TOOL_TRACE. Never invent metrics.",
    "- Reply under 130 words in the reply string.",
    "",
    `USER_CONTEXT:\n${JSON.stringify(data.userContext)}`,
    "",
    `TOOL_TRACE:\n${JSON.stringify(toolTrace)}`,
    "",
    `Recent conversation:\n${historyLines || "(none)"}`,
    "",
    `User message:\n${message}`,
  ].join("\n");

  const syn = await geminiGenerate(apiKey, {
    systemInstruction: {
      parts: [{ text: "You are a supportive fitness coach in the Healthify app. Output valid JSON only." }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: synthesisUserPrompt }],
      },
    ],
    generationConfig: {
      temperature: 0.35,
      topP: 0.9,
      maxOutputTokens: 600,
    },
  });

  const textOut = syn.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("\n") ?? "";
  const parsed = extractJsonObject(textOut);
  if (!parsed || typeof parsed !== "object") {
    throw new Error(`Synthesis JSON parse failed: ${textOut.slice(0, 400)}`);
  }

  const rec = parsed as Record<string, unknown>;
  const reply = typeof rec.reply === "string" ? rec.reply.trim() : "";
  if (!reply) {
    throw new Error("Missing reply in synthesis.");
  }

  const actionsRaw = rec.actions;
  const actions: { label: string; href: string }[] = [];
  if (Array.isArray(actionsRaw)) {
    const ALLOWED = ["/dashboard", "/meals", "/workout", "/analytics", "/weight", "/coach"];
    for (const item of actionsRaw.slice(0, 3)) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      const label = typeof o.label === "string" ? o.label.trim().slice(0, 48) : "";
      const href = typeof o.href === "string" ? o.href.trim() : "";
      if (!label || !href.startsWith("/")) continue;
      const ok = ALLOWED.some((p) => href === p || href.startsWith(`${p}?`) || href.startsWith(`${p}/`));
      if (ok) actions.push({ label, href });
    }
  }

  return { reply: reply.slice(0, 4000), actions, toolTrace };
}
