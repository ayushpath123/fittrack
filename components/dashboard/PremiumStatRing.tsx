"use client";

import { motion } from "framer-motion";
import { useId } from "react";

const VB = 100;
const CX = 50;
const CY = 50;
const R = 38;
const STROKE = 5.5;
const CIRC = 2 * Math.PI * R;

type Props = {
  label: string;
  centerValue: string;
  centerUnit?: string;
  pct: number;
  gradientFrom: string;
  gradientTo: string;
  delay?: number;
  /** When true, high fill is warning (e.g. calories over target) */
  overAccent?: boolean;
};

export function PremiumStatRing({
  label,
  centerValue,
  centerUnit,
  pct,
  gradientFrom,
  gradientTo,
  delay = 0,
  overAccent,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const gradId = `rg-${uid}`;
  const glowId = `gl-${uid}`;
  const clamped = Math.max(0, Math.min(100, pct));
  const targetOffset = CIRC * (1 - clamped / 100);

  const strokeMain = overAccent ? "#FF5C7A" : `url(#${gradId})`;

  const trackColor = "rgba(255,255,255,.08)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex flex-col items-center"
    >
      <div
        className="relative rounded-full"
        style={{
          filter: overAccent
            ? "drop-shadow(0 0 10px rgba(255,92,122,.35))"
            : `drop-shadow(0 0 14px color-mix(in srgb, ${gradientFrom} 45%, transparent))`,
        }}
      >
        <svg width="100%" height="100%" viewBox={`0 0 ${VB} ${VB}`} className="h-[5.75rem] w-[5.75rem] sm:h-[6.25rem] sm:w-[6.25rem]" aria-hidden>
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={gradientFrom} />
              <stop offset="100%" stopColor={gradientTo} />
            </linearGradient>
            <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="2.5" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle cx={CX} cy={CY} r={R} fill="none" stroke={trackColor} strokeWidth={STROKE} />
          <motion.circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke={strokeMain}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRC}
            initial={{ strokeDashoffset: CIRC }}
            animate={{ strokeDashoffset: targetOffset }}
            transition={{ duration: 1.15, delay: delay + 0.06, ease: [0.22, 1, 0.36, 1] }}
            transform={`rotate(-90 ${CX} ${CY})`}
            filter={overAccent ? undefined : `url(#${glowId})`}
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-1 pt-0.5">
          <span className="num max-w-[5.5rem] truncate text-center text-[0.95rem] font-bold leading-none tracking-tight text-[var(--white)] sm:text-[1.05rem]">
            {centerValue}
          </span>
          {centerUnit ? (
            <span className="mt-0.5 text-center text-[9px] font-medium uppercase tracking-wide text-[var(--muted)]">{centerUnit}</span>
          ) : null}
          <span
            className="num mt-1 text-[10px] font-semibold tabular-nums"
            style={{ color: overAccent ? "#FF8FA8" : gradientTo }}
          >
            {clamped}%
          </span>
        </div>
      </div>
      <p className="mt-2 max-w-[6.5rem] text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{label}</p>
    </motion.div>
  );
}
