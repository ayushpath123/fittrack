import { ReactNode } from "react";

interface GlowPillProps {
  children: ReactNode;
  color: "blue" | "green" | "amber" | "red" | "purple";
  pulse?: boolean;
}

const colorMap = {
  blue: { bg: "rgba(190,255,71,.12)", border: "rgba(190,255,71,.25)", text: "#BEFF47" },
  green: { bg: "rgba(45,212,160,.12)", border: "rgba(45,212,160,.25)", text: "#2DD4A0" },
  amber: { bg: "rgba(255,181,71,.12)", border: "rgba(255,181,71,.25)", text: "#FFB547" },
  red: { bg: "rgba(255,92,122,.12)", border: "rgba(255,92,122,.25)", text: "#FF5C7A" },
  purple: { bg: "rgba(167,139,250,.12)", border: "rgba(167,139,250,.25)", text: "#A78BFA" },
} as const;

export function GlowPill({ children, color, pulse }: GlowPillProps) {
  const c = colorMap[color];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "4px 12px",
        borderRadius: 999,
        background: c.bg,
        border: `1px solid ${c.border}`,
        fontSize: 11,
        fontWeight: 700,
        color: c.text,
        letterSpacing: ".04em",
      }}
    >
      {pulse ? <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.text, animation: "pulse-glow 2s ease-in-out infinite" }} /> : null}
      {children}
    </span>
  );
}
