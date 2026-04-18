"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import StepContainer from "../StepContainer";
import type { MacroResults } from "../types";

interface ProcessingStepProps {
  direction: number;
  results: MacroResults | null;
  onDashboard: () => void;
}

const MESSAGES = [
  { main: "Calculating your BMR…", sub: "Using the Mifflin-St Jeor formula" },
  { main: "Adjusting for your goal…", sub: "Applying caloric adjustment" },
  { main: "Optimising macro split…", sub: "Balancing protein, carbs & fat" },
  { main: "Your plan is ready! \u{1F389}", sub: "Everything is personalised for you" },
];

const MACRO_COLORS: Record<string, string> = {
  Calories: "text-[#BEFF47]",
  Protein: "text-[#57B4FF]",
  Carbs: "text-[#FF9B57]",
  Fat: "text-[#FF6B9D]",
};

export default function ProcessingStep({ direction, results, onDashboard }: ProcessingStepProps) {
  const [msgIdx, setMsgIdx] = useState(0);
  const done = results !== null;

  useEffect(() => {
    if (done) {
      setMsgIdx(3);
      return;
    }
    const timers = [0, 650, 1350].map((delay, i) => setTimeout(() => setMsgIdx(i + 1), delay + 350));
    return () => timers.forEach(clearTimeout);
  }, [done]);

  const macros = results
    ? [
        { label: "Calories", value: results.calorieTarget, unit: "kcal" },
        { label: "Protein", value: results.proteinTarget, unit: "g" },
        { label: "Carbs", value: results.carbTarget, unit: "g" },
        { label: "Fat", value: results.fatTarget, unit: "g" },
      ]
    : [];

  return (
    <StepContainer direction={direction}>
      <div className="py-3 text-center">
        <div className="relative mx-auto mb-8 h-[110px] w-[110px]">
          <AnimatePresence mode="wait">
            {!done ? (
              <motion.svg
                key="ring"
                width="110"
                height="110"
                viewBox="0 0 110 110"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute inset-0"
              >
                <circle cx="55" cy="55" r="46" stroke="rgba(255,255,255,0.07)" strokeWidth="3" fill="none" />
                <g
                  className="origin-[55px_55px] animate-spin"
                  style={{ animationDuration: "1.8s", animationTimingFunction: "linear" }}
                >
                  <circle
                    cx="55"
                    cy="55"
                    r="46"
                    stroke="#BEFF47"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray="280"
                    style={{
                      animation: "ob-rdash 1.8s cubic-bezier(0.4,0,0.2,1) infinite",
                    }}
                  />
                </g>
                <circle cx="55" cy="55" r="32" stroke="rgba(190,255,71,0.12)" strokeWidth="2" fill="none" />
                <circle cx="55" cy="55" r="8" fill="#BEFF47" className="animate-pulse" />
              </motion.svg>
            ) : (
              <motion.div
                key="check"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 280, damping: 20 }}
                className="absolute inset-0 flex items-center justify-center rounded-full border-2 border-[#BEFF47] bg-[#BEFF47]/[0.08]"
              >
                <svg width="40" height="30" viewBox="0 0 40 30" fill="none">
                  <motion.path
                    d="M3 15L14 26L37 3"
                    stroke="#BEFF47"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
                  />
                </svg>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={msgIdx}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <p
              className="mb-1 text-[19px] font-bold text-white"
              style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}
            >
              {MESSAGES[msgIdx]?.main}
            </p>
            <p className="text-[13px] font-light text-white/35">{MESSAGES[msgIdx]?.sub}</p>
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {done && results && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.35, ease: "easeOut" }}
              className="mt-8 text-left"
            >
              <div className="mb-2.5 grid grid-cols-2 gap-2.5">
                {macros.map((m, i) => (
                  <motion.div
                    key={m.label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + i * 0.07 }}
                    className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3.5"
                  >
                    <p className="mb-1 text-[10.5px] font-medium uppercase tracking-[0.08em] text-white/38">{m.label}</p>
                    <p
                      className={`text-[27px] font-bold leading-none ${MACRO_COLORS[m.label] ?? "text-white"}`}
                      style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}
                    >
                      {m.value}
                      <span className="ml-0.5 text-[13px] font-normal text-white/35">{m.unit}</span>
                    </p>
                  </motion.div>
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.72 }}
                className="mb-5 flex items-center justify-between rounded-2xl border border-[#57B4FF]/15 bg-[#57B4FF]/[0.055] px-5 py-3.5"
              >
                <span className="text-[13.5px] text-white/45">
                  {"\u{1F4A7} Daily water"}
                </span>
                <span
                  className="text-[20px] font-bold text-[#57B4FF]"
                  style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}
                >
                  {(Math.round(results.waterTargetMl / 100) / 10).toFixed(1)}
                  <span className="ml-0.5 text-[13px] font-normal text-white/35">L</span>
                </span>
              </motion.div>

              <motion.button
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.88 }}
                onClick={onDashboard}
                className="w-full cursor-pointer rounded-2xl bg-[#BEFF47] py-4 text-[15px] font-medium text-[#06080A] transition-all hover:-translate-y-px hover:bg-[#CCFF5A] hover:shadow-[0_6px_28px_rgba(190,255,71,.28)] active:translate-y-0"
              >
                Open Dashboard →
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </StepContainer>
  );
}
