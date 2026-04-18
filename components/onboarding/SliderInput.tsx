"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface SliderInputProps {
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (value: number) => void;
}

const stepBtn =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] text-white/45 transition-colors hover:border-[#BEFF47]/35 hover:bg-[#BEFF47]/[0.08] hover:text-[#BEFF47] disabled:pointer-events-none disabled:opacity-25";

export default function SliderInput({ value, min, max, unit, onChange }: SliderInputProps) {
  const pct = ((value - min) / (max - min)) * 100;
  const bump = (delta: number) => onChange(Math.min(max, Math.max(min, value + delta)));
  const threeDigits = value >= 100;

  return (
    <div className="mb-8 w-full min-w-0">
      <div className="mb-7 flex w-full min-w-0 items-center gap-4 sm:gap-5">
        {/* Unit under the number so kg/cm never sit in the same row as the step buttons (3-digit values need the width) */}
        <div className="min-w-0 flex-1 pr-1">
          {/* mode="wait" (not popLayout): exit finishes before enter — keeps normal layout so nothing stacks over the step buttons */}
          <div className="relative min-h-[3.25rem] sm:min-h-[5rem]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={value}
                initial={{ opacity: 0.65, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0.65, y: 10 }}
                transition={{ duration: 0.14, ease: "easeOut" }}
                className={cn(
                  "block w-full max-w-full font-extrabold leading-none text-white tabular-nums tracking-[-0.06em]",
                  threeDigits
                    ? "text-[clamp(2.25rem,10vw+0.5rem,3.85rem)] sm:text-[clamp(2.75rem,9vw+1rem,4.35rem)]"
                    : "text-[clamp(2.75rem,13vw,5.125rem)]",
                )}
                style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}
              >
                {value}
              </motion.span>
            </AnimatePresence>
          </div>
          <span
            className="mt-1 block text-xl font-light leading-none text-white/35 sm:text-2xl"
            style={{ fontFamily: "var(--font-body), system-ui, sans-serif" }}
          >
            {unit}
          </span>
        </div>
        <div className="flex w-9 shrink-0 flex-col items-stretch justify-center gap-1 self-center">
          <button
            type="button"
            className={stepBtn}
            disabled={value >= max}
            aria-label={`Increase by 1 ${unit}`}
            onClick={() => bump(1)}
          >
            <ChevronUp className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          </button>
          <button
            type="button"
            className={stepBtn}
            disabled={value <= min}
            aria-label={`Decrease by 1 ${unit}`}
            onClick={() => bump(-1)}
          >
            <ChevronDown className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          </button>
        </div>
      </div>

      <div className="relative h-1.5 rounded-full bg-white/[0.09]">
        <div
          className="pointer-events-none absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-[#BEFF47] to-[#8BF000] transition-[width] duration-[40ms]"
          style={{ width: `${pct}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          step={1}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className="ob-slider absolute inset-y-0 my-auto w-full cursor-pointer appearance-none bg-transparent outline-none"
        />
      </div>

      <div className="mt-2.5 flex justify-between">
        <span className="text-xs text-white/20">
          {min} {unit}
        </span>
        <span className="text-xs text-white/20">
          {max} {unit}
        </span>
      </div>
    </div>
  );
}
