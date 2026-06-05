"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import StepContainer from "../StepContainer";
import type { MacroResults } from "../types";
import { getRecommendedPreset } from "@/lib/meal-templates";
import { normalizeMealType } from "@/lib/meal-templates";

interface FirstLogStepProps {
  direction: number;
  results: MacroResults;
  onDone: () => void;
}

export default function FirstLogStep({ direction, results, onDone }: FirstLogStepProps) {
  const targets = {
    calories: results.calorieTarget,
    protein: results.proteinTarget,
    carbs: results.carbTarget,
    fat: results.fatTarget,
  };
  const template = getRecommendedPreset(targets);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function logFirstMeal() {
    setIsSaving(true);
    setError("");
    try {
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          date: new Date().toISOString().split("T")[0],
          mealType: normalizeMealType(template.mealType),
          items: [],
          macros: {
            calories: template.calories,
            protein: template.protein,
            carbs: template.carbs,
            fat: template.fat,
          },
        }),
      });
      if (!res.ok) throw new Error("save failed");
      if (typeof window !== "undefined") {
        window.localStorage.setItem("fittrack-first-log-done", "1");
      }
      onDone();
    } catch {
      setError("Could not log. You can log from Today screen.");
      setIsSaving(false);
    }
  }

  return (
    <StepContainer direction={direction}>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#B8E86A]">Step 2 of 2</p>
      <h2
        className="mb-2 text-[26px] font-extrabold leading-tight text-white"
        style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}
      >
        Log your first meal
      </h2>
      <p className="mb-6 text-sm text-white/45">
        One tap logs typical {template.name.toLowerCase()} macros. You can adjust anytime.
      </p>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4"
      >
        <p className="text-lg font-bold text-[#BEFF47]">{template.calories} kcal</p>
        <p className="mt-1 text-xs text-white/50">
          P {template.protein}g · C {template.carbs}g · F {template.fat}g
        </p>
      </motion.div>

      <button
        type="button"
        disabled={isSaving}
        onClick={() => void logFirstMeal()}
        className="w-full rounded-2xl bg-[#BEFF47] py-4 text-[15px] font-semibold text-[#06080A] disabled:opacity-50"
      >
        {isSaving ? "Logging…" : `Log ${template.name}`}
      </button>
      <button
        type="button"
        disabled={isSaving}
        onClick={onDone}
        className="mt-3 w-full py-2 text-sm text-white/40"
      >
        Skip for now
      </button>
      {error ? <p className="mt-2 text-center text-xs text-red-400">{error}</p> : null}
    </StepContainer>
  );
}
