"use client";

import { motion } from "framer-motion";
import type { Goal } from "./types";

interface GoalCardProps {
  id: Goal;
  emoji: string;
  title: string;
  description: string;
  tag: string;
  selected: boolean;
  onSelect: (goal: Goal) => void;
}

export default function GoalCard({ id, emoji, title, description, tag, selected, onSelect }: GoalCardProps) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.975 }}
      onClick={() => onSelect(id)}
      className={[
        "w-full cursor-pointer rounded-[18px] border px-5 py-4 text-left transition-all duration-200",
        selected
          ? "border-[#BEFF47] bg-[#BEFF47]/[0.055] shadow-[0_0_28px_rgba(190,255,71,0.08)]"
          : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.14] hover:bg-white/[0.038]",
      ].join(" ")}
    >
      <div className="flex items-start gap-3.5">
        <span className="mt-0.5 text-[22px] leading-none">{emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span
              className="text-[15px] font-bold text-white"
              style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}
            >
              {title}
            </span>
            <span
              className={[
                "rounded-full px-2 py-0.5 text-[11px] font-medium",
                selected ? "bg-[#BEFF47]/15 text-[#BEFF47]" : "bg-white/[0.07] text-white/35",
              ].join(" ")}
            >
              {tag}
            </span>
          </div>
          <p className="text-[12.5px] font-light leading-relaxed text-white/38">{description}</p>
        </div>

        <motion.div
          initial={false}
          animate={selected ? { scale: 1, opacity: 1 } : { scale: 0.4, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 22 }}
          className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#BEFF47]"
        >
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path
              d="M1 4L3.5 6.5L9 1"
              stroke="#06080A"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.div>
      </div>
    </motion.button>
  );
}
