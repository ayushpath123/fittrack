"use client";

import { useEffect, useRef, useState } from "react";
import { RING_CIRC, RING_RADIUS, ringOffset } from "@/lib/ring";

interface RingProgressProps {
  value: number;
  target: number;
  label: string;
  unit: string;
  color: string;
  trackColor: string;
  delay?: number;
  size?: number;
}

export function RingProgress({
  value,
  target,
  label,
  unit,
  color,
  trackColor,
  delay = 0,
  size = 110,
}: RingProgressProps) {
  const ringRef = useRef<SVGCircleElement>(null);
  const [display, setDisplay] = useState(0);
  const offset = ringOffset(value, target);
  const pct = Math.round(Math.min((value / (target || 1)) * 100, 100));
  const isOver = target > 0 && value > target;
  const finalColor = isOver ? "#DC2626" : color;

  useEffect(() => {
    const ring = ringRef.current;
    if (!ring) return;
    ring.style.strokeDashoffset = String(RING_CIRC);
    ring.style.stroke = finalColor;

    const t = setTimeout(() => {
      ring.style.transition = "stroke-dashoffset 1.1s cubic-bezier(.22,1,.36,1)";
      ring.style.strokeDashoffset = String(offset);
    }, delay + 80);
    return () => clearTimeout(t);
  }, [offset, delay, finalColor]);

  useEffect(() => {
    const duration = 900;
    const start = Date.now() + delay;
    let frame = 0;

    const tick = () => {
      const now = Date.now();
      const elapsed = Math.max(0, now - start);
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    const timeout = setTimeout(() => {
      frame = requestAnimationFrame(tick);
    }, delay);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(frame);
    };
  }, [value, delay]);

  const cx = size / 2;
  const cy = size / 2;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div key={`${value}-${target}`} style={{ position: "relative", width: size, height: size, animation: "pulse-ring .8s ease", borderRadius: "50%" }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={cx} cy={cy} r={RING_RADIUS} fill="none" stroke={trackColor} strokeWidth={8} />
          <circle
            cx={cx}
            cy={cy}
            r={RING_RADIUS}
            fill="none"
            stroke={finalColor}
            strokeWidth={2}
            opacity={0}
            style={{
              animation: `ring-burst .6s ease-out ${delay + 1200}ms forwards`,
              transformOrigin: `${cx}px ${cy}px`,
            }}
          />
          <circle
            ref={ringRef}
            cx={cx}
            cy={cy}
            r={RING_RADIUS}
            fill="none"
            stroke={finalColor}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={RING_CIRC}
            strokeDashoffset={RING_CIRC}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        </svg>

        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontSize: size < 100 ? 16 : 20,
              fontWeight: 700,
              letterSpacing: "-.03em",
              fontVariantNumeric: "tabular-nums",
              color: finalColor,
              animation: `num-count .5s ease ${delay + 600}ms both`,
            }}
          >
            {display.toLocaleString()}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              color: "var(--color-text-tertiary, #9CA3AF)",
              marginTop: -2,
            }}
          >
            {unit}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--muted, #9CA3AF)",
              marginTop: 2,
              textAlign: "center",
              lineHeight: 1.2,
              maxWidth: size + 24,
              animation: `fade-slide-up .3s ease ${delay + 1000}ms both`,
              opacity: 0,
              animationFillMode: "forwards",
            }}
          >
            Goal{" "}
            {unit === "kcal"
              ? `${target.toLocaleString()} kcal`
              : `${target}${unit}`}
          </span>
        </div>
      </div>

      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--color-text-secondary, #6B7280)",
          animation: `label-slide .4s ease ${delay + 900}ms both`,
          opacity: 0,
          animationFillMode: "forwards",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: finalColor,
          animation: `fade-slide-up .3s ease ${delay + 1000}ms both`,
          opacity: 0,
          animationFillMode: "forwards",
        }}
      >
        {pct}%
      </span>
    </div>
  );
}
