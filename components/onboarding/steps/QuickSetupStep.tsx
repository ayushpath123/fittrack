"use client";

import { useState } from "react";
import StepContainer from "../StepContainer";
import SliderInput from "../SliderInput";
import type { Goal } from "../types";

const GOALS: { id: Goal; label: string; emoji: string }[] = [
  { id: "lose", label: "Lose", emoji: "🔥" },
  { id: "maintain", label: "Maintain", emoji: "⚖️" },
  { id: "gain", label: "Gain", emoji: "💪" },
];

interface QuickSetupStepProps {
  direction: number;
  goal: Goal;
  weight: number;
  height: number;
  isSaving: boolean;
  onGoalChange: (goal: Goal) => void;
  onWeightChange: (v: number) => void;
  onHeightChange: (v: number) => void;
  onFinish: () => void;
}

export default function QuickSetupStep({
  direction,
  goal,
  weight,
  height,
  isSaving,
  onGoalChange,
  onWeightChange,
  onHeightChange,
  onFinish,
}: QuickSetupStepProps) {
  const [showHeight, setShowHeight] = useState(false);

  return (
    <StepContainer direction={direction}>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#B8E86A]">Step 1 of 2</p>
      <h2
        className="mb-1 text-[26px] font-extrabold leading-tight text-white"
        style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}
      >
        Quick setup
      </h2>
      <p className="mb-5 text-sm text-white/45">Pick a goal and weight — we&apos;ll set your daily targets.</p>

      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/30">Your goal</p>
      <div className="mb-5 grid grid-cols-3 gap-2">
        {GOALS.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => onGoalChange(g.id)}
            className={`rounded-xl border px-2 py-3 text-center transition-all ${
              goal === g.id
                ? "border-[#BEFF47] bg-[#BEFF47]/10 text-[#BEFF47]"
                : "border-white/[0.08] bg-white/[0.02] text-white/55 hover:border-white/15"
            }`}
          >
            <span className="block text-lg">{g.emoji}</span>
            <span className="mt-1 block text-[11px] font-semibold">{g.label}</span>
          </button>
        ))}
      </div>

      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/30">Weight</p>
      <SliderInput value={weight} min={40} max={120} unit="kg" onChange={onWeightChange} />

      <button
        type="button"
        onClick={() => setShowHeight((v) => !v)}
        className="mb-3 text-[11px] font-semibold text-[#B8E86A]"
      >
        {showHeight ? "Hide height" : `Height optional (${height} cm) — tap to adjust`}
      </button>
      {showHeight ? (
        <div className="mb-2">
          <SliderInput value={height} min={140} max={210} unit="cm" onChange={onHeightChange} />
        </div>
      ) : null}

      <button
        type="button"
        disabled={isSaving}
        onClick={onFinish}
        className="mt-2 w-full rounded-2xl bg-[#BEFF47] py-4 text-[15px] font-semibold text-[#06080A] transition-all hover:bg-[#CCFF5A] disabled:opacity-50"
      >
        {isSaving ? "Saving…" : "Set targets & log first meal"}
      </button>
    </StepContainer>
  );
}
