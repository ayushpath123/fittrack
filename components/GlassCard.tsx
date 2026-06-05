import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  glow?: "blue" | "green" | "amber" | "purple" | "red";
  onClick?: () => void;
}

const glowMap = {
  blue: { bg: "rgba(190,255,71,.05)", border: "rgba(190,255,71,.14)" },
  green: { bg: "rgba(45,212,160,.06)", border: "rgba(45,212,160,.18)" },
  amber: { bg: "rgba(255,181,71,.06)", border: "rgba(255,181,71,.18)" },
  purple: { bg: "rgba(167,139,250,.06)", border: "rgba(167,139,250,.18)" },
  red: { bg: "rgba(255,92,122,.06)", border: "rgba(255,92,122,.18)" },
} as const;

export function GlassCard({ children, className = "", style = {}, glow, onClick }: GlassCardProps) {
  const glowStyle = glow ? glowMap[glow] : { bg: "rgba(255,255,255,.05)", border: "rgba(255,255,255,.09)" };

  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        background: glowStyle.bg,
        border: `1px solid ${glowStyle.border}`,
        borderRadius: 22,
        backdropFilter: "blur(22px) saturate(1.4)",
        WebkitBackdropFilter: "blur(22px) saturate(1.4)",
        boxShadow: "inset 0 1px 0 var(--glass-highlight), var(--shadow-soft)",
        transition: "background .2s, border-color .2s, transform .2s, box-shadow .2s",
        ...(onClick ? { cursor: "pointer" } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}
