"use client";

import StepContainer from "../StepContainer";
import SliderInput from "../SliderInput";

interface HeightStepProps {
  direction: number;
  value: number;
  onChange: (v: number) => void;
  onBack: () => void;
  onNext: () => void;
}

export default function HeightStep({ direction, value, onChange, onBack, onNext }: HeightStepProps) {
  return (
    <StepContainer direction={direction}>
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-white/30">Step 2 of 3</p>
      <h2
        className="mb-6 text-[26px] font-bold tracking-[-0.5px] text-white"
        style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}
      >
        How tall are you?
      </h2>

      <SliderInput value={value} min={140} max={210} unit="cm" onChange={onChange} />

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
          className="flex-1 cursor-pointer rounded-2xl bg-[#BEFF47] py-4 text-[15px] font-medium text-[#06080A] transition-all hover:-translate-y-px hover:bg-[#CCFF5A] hover:shadow-[0_6px_28px_rgba(190,255,71,.28)] active:translate-y-0"
        >
          Continue
        </button>
      </div>
    </StepContainer>
  );
}
