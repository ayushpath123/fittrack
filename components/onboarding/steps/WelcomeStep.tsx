"use client";

import StepContainer from "../StepContainer";

interface WelcomeStepProps {
  direction: number;
  onNext: () => void;
}

const features = [
  { icon: "\u26A1", color: "bg-[#BEFF47]/10 text-[#BEFF47]", text: "Smart calorie calculation via BMR" },
  { icon: "\u{1F3AF}", color: "bg-[#FF9B57]/10 text-[#FF9B57]", text: "Goal-based macro split" },
  { icon: "\u{1F4A7}", color: "bg-[#57B4FF]/10 text-[#57B4FF]", text: "Personalised hydration target" },
];

export default function WelcomeStep({ direction, onNext }: WelcomeStepProps) {
  return (
    <StepContainer direction={direction}>
      <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#BEFF47]/22 bg-[#BEFF47]/10 px-3.5 py-1.5">
        <span className="h-[7px] w-[7px] rounded-full bg-[#BEFF47]" />
        <span className="text-xs font-medium text-[#BEFF47]">Less than 30 seconds</span>
      </div>

      <h1
        className="mb-3 text-[33px] font-extrabold leading-[1.18] tracking-[-1px] text-white"
        style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}
      >
        Let&rsquo;s personalise
        <br />
        <span className="text-[#BEFF47]">your fitness plan</span>
      </h1>
      <p className="mb-7 text-[15px] font-light leading-relaxed text-white/42">
        Answer a few quick questions and we&rsquo;ll calculate your optimal nutrition targets automatically.
      </p>

      <div className="mb-8 space-y-2.5">
        {features.map((f) => (
          <div
            key={f.text}
            className="flex items-center gap-3 rounded-xl border border-white/[0.055] bg-white/[0.025] px-4 py-3"
          >
            <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[8px] text-sm ${f.color}`}>
              {f.icon}
            </span>
            <span className="text-[13.5px] text-white/55">{f.text}</span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onNext}
        className="w-full cursor-pointer rounded-2xl bg-[#BEFF47] py-4 text-[15px] font-medium text-[#06080A] transition-all hover:-translate-y-px hover:bg-[#CCFF5A] hover:shadow-[0_6px_28px_rgba(190,255,71,.28)] active:translate-y-0"
      >
        Get Started →
      </button>
    </StepContainer>
  );
}
