"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Pencil, X } from "lucide-react";
import toast from "react-hot-toast";
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

const MACRO_FIELDS = [
  { label: "Calories", key: "calorieTarget" as const, unit: "kcal", color: "text-[#BEFF47]", editBorder: "border-[#BEFF47]/25" },
  { label: "Protein", key: "proteinTarget" as const, unit: "g", color: "text-[#57B4FF]", editBorder: "border-[#57B4FF]/25" },
  { label: "Carbs", key: "carbTarget" as const, unit: "g", color: "text-[#FF9B57]", editBorder: "border-[#FF9B57]/25" },
  { label: "Fat", key: "fatTarget" as const, unit: "g", color: "text-[#FF6B9D]", editBorder: "border-[#FF6B9D]/25" },
];

export default function ProcessingStep({ direction, results, onDashboard }: ProcessingStepProps) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [displayResults, setDisplayResults] = useState<MacroResults | null>(results);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<MacroResults | null>(null);
  const [saving, setSaving] = useState(false);
  const done = displayResults !== null;

  useEffect(() => {
    setDisplayResults(results);
  }, [results]);

  useEffect(() => {
    if (done) {
      const timer = setTimeout(() => setMsgIdx(3), 0);
      return () => clearTimeout(timer);
    }
    if (!done) {
      const timers = [0, 650, 1350].map((delay, i) => setTimeout(() => setMsgIdx(i + 1), delay + 350));
      return () => timers.forEach(clearTimeout);
    }
    return () => {};
  }, [done]);

  function startEdit() {
    if (!displayResults) return;
    setDraft({ ...displayResults });
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(null);
    setEditing(false);
  }

  function updateDraft(key: keyof MacroResults, raw: string) {
    if (!draft) return;
    setDraft({ ...draft, [key]: parseInt(raw || "0", 10) });
  }

  async function saveEdit() {
    if (!draft) return;
    if (
      draft.calorieTarget <= 0 ||
      draft.proteinTarget <= 0 ||
      draft.carbTarget <= 0 ||
      draft.fatTarget <= 0 ||
      draft.waterTargetMl <= 0
    ) {
      toast.error("All targets must be greater than zero.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/settings/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...draft,
          reminderEnabled: false,
          reminderTime: "09:00",
        }),
      });
      if (!res.ok) {
        toast.error("Could not save your changes. Try again.");
        return;
      }
      setDisplayResults(draft);
      setEditing(false);
      setDraft(null);
      toast.success("Targets updated");
    } catch {
      toast.error("Network error — could not save.");
    } finally {
      setSaving(false);
    }
  }

  const active = editing && draft ? draft : displayResults;

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
          {done && active && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.35, ease: "easeOut" }}
              className="mt-8 text-left"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-white/38">Your targets</p>
                {editing ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={saving}
                      className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-white/10 text-white/40 transition-colors hover:border-white/20 hover:text-white/65 disabled:opacity-40"
                      aria-label="Cancel editing"
                    >
                      <X size={11} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => void saveEdit()}
                      disabled={saving}
                      className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-[#BEFF47]/35 text-[#BEFF47] transition-colors hover:border-[#BEFF47]/55 hover:bg-[#BEFF47]/10 disabled:opacity-40"
                      aria-label="Save changes"
                    >
                      <Check size={11} aria-hidden />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={startEdit}
                    className="flex cursor-pointer items-center gap-1 rounded-md border border-white/[0.08] px-2 py-0.5 text-[11px] text-white/40 transition-colors hover:border-[#BEFF47]/25 hover:text-[#BEFF47]/80"
                    aria-label="Edit macro targets"
                  >
                    <Pencil size={10} aria-hidden />
                    Edit
                  </button>
                )}
              </div>

              <div className="mb-2.5 grid grid-cols-2 gap-2.5">
                {MACRO_FIELDS.map((m, i) => (
                  <motion.div
                    key={m.label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + i * 0.07 }}
                    className={[
                      "rounded-2xl border bg-white/[0.03] px-4 py-3.5 transition-colors",
                      editing ? `${m.editBorder} bg-white/[0.02]` : "border-white/[0.07]",
                    ].join(" ")}
                  >
                    <p className="mb-1 text-[10.5px] font-medium uppercase tracking-[0.08em] text-white/38">{m.label}</p>
                    {editing && draft ? (
                      <div className="flex items-baseline gap-0.5">
                        <input
                          type="number"
                          value={draft[m.key]}
                          onChange={(e) => updateDraft(m.key, e.target.value)}
                          className={[
                            "w-full min-w-0 bg-transparent text-[22px] font-bold leading-none focus:outline-none",
                            m.color,
                          ].join(" ")}
                          style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}
                        />
                        <span className="shrink-0 text-[13px] font-normal text-white/35">{m.unit}</span>
                      </div>
                    ) : (
                      <p
                        className={`text-[27px] font-bold leading-none ${m.color}`}
                        style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}
                      >
                        {active[m.key]}
                        <span className="ml-0.5 text-[13px] font-normal text-white/35">{m.unit}</span>
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.72 }}
                className={[
                  "mb-5 flex items-center justify-between rounded-2xl border px-5 py-3.5 transition-colors",
                  editing
                    ? "border-[#57B4FF]/25 bg-[#57B4FF]/[0.03]"
                    : "border-[#57B4FF]/15 bg-[#57B4FF]/[0.055]",
                ].join(" ")}
              >
                <span className="text-[13.5px] text-white/45">{"\u{1F4A7} Daily water"}</span>
                {editing && draft ? (
                  <div className="flex items-baseline gap-1">
                    <input
                      type="number"
                      value={draft.waterTargetMl}
                      onChange={(e) => updateDraft("waterTargetMl", e.target.value)}
                      className="w-16 bg-transparent text-right text-[18px] font-bold text-[#57B4FF] focus:outline-none"
                      style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}
                    />
                    <span className="text-[13px] font-normal text-white/35">ml</span>
                  </div>
                ) : (
                  <span
                    className="text-[20px] font-bold text-[#57B4FF]"
                    style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}
                  >
                    {(Math.round(active.waterTargetMl / 100) / 10).toFixed(1)}
                    <span className="ml-0.5 text-[13px] font-normal text-white/35">L</span>
                  </span>
                )}
              </motion.div>

              <motion.button
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.88 }}
                onClick={onDashboard}
                disabled={editing}
                className="w-full cursor-pointer rounded-2xl bg-[#BEFF47] py-4 text-[15px] font-medium text-[#06080A] transition-all hover:-translate-y-px hover:bg-[#CCFF5A] hover:shadow-[0_6px_28px_rgba(190,255,71,.28)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Log first meal →
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </StepContainer>
  );
}
