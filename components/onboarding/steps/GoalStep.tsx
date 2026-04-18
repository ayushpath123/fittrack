"use client";

import StepContainer from "../StepContainer";
import GoalCard from "../GoalCard";
import type { Goal } from "../types";

interface GoalStepProps {
  direction: number;
  selected: Goal | null;
  onSelect: (goal: Goal) => void;
  onBack: () => void;
  onNext: () => void;
}

const GOALS: {
  id: Goal;
  emoji: string;
  title: string;
  description: string;
  tag: string;
}[] = [
  {
    id: "lose",
    emoji: "\u{1F525}",
    title: "Lose Fat",
    description: "Caloric deficit with high protein to preserve muscle mass",
    tag: "−400 kcal",
  },
  {
    id: "maintain",
    emoji: "\u2696\uFE0F",
    title: "Maintain",
    description: "Balanced nutrition to sustain your current physique",
    tag: "maintenance",
  },
  {
    id: "gain",
    emoji: "\u{1F4AA}",
    title: "Gain Muscle",
    description: "Lean bulk with caloric surplus and high protein intake",
    tag: "+300 kcal",
  },
];

export default function GoalStep({ direction, selected, onSelect, onBack, onNext }: GoalStepProps) {
  return (
    <StepContainer direction={direction}>
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-white/30">Step 3 of 3</p>
      <h2
        className="mb-5 text-[26px] font-bold tracking-[-0.5px] text-white"
        style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}
      >
        What&rsquo;s your goal?
      </h2>

      <div className="mb-6 space-y-2.5">
        {GOALS.map((g) => (
          <GoalCard key={g.id} {...g} selected={selected === g.id} onSelect={onSelect} />
        ))}
      </div>

      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={onBack}
          className="w-[52px] flex-shrink-0 cursor-pointer rounded-2xl border border-white/10 bg-transparent py-4 text-white/38 transition-all hover:border-white/20 hover:text-white/65"
        >
          ←
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!selected}
          className="flex-1 cursor-pointer rounded-2xl bg-[#BEFF47] py-4 text-[15px] font-medium text-[#06080A] transition-all hover:-translate-y-px hover:bg-[#CCFF5A] hover:shadow-[0_6px_28px_rgba(190,255,71,.28)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:translate-y-0 disabled:hover:shadow-none"
        >
          Calculate My Plan
        </button>
      </div>
    </StepContainer>
  );
}
