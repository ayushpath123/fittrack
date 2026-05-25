"use client";

import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";

export function DashboardRewardTeasers({ lines }: { lines: string[] }) {
  if (!lines.length) return null;
  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center gap-1.5 px-0.5">
        <TrendingUp size={13} className="text-[#57B4FF]" aria-hidden />
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Momentum</p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {lines.map((line, i) => (
          <motion.span
            key={`${line}-${i}`}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.2 + i * 0.05 }}
            className="shrink-0 max-w-[min(100%,18rem)] rounded-2xl border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-[11px] font-medium leading-snug text-[var(--white)] shadow-[inset_0_1px_0_rgba(255,255,255,.06)]"
          >
            {line}
          </motion.span>
        ))}
      </div>
    </div>
  );
}
