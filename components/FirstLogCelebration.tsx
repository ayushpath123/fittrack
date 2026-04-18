"use client";

import { useEffect, useRef } from "react";

interface FirstLogCelebrationProps {
  onClose: () => void;
  calories: number;
  protein: number;
}

export function FirstLogCelebration({ onClose, calories, protein }: FirstLogCelebrationProps) {
  const confettiRef = useRef<HTMLDivElement>(null);
  const fireRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const confettiLayer = confettiRef.current;
    const fireLayer = fireRef.current;
    if (!confettiLayer || !fireLayer) return;

    spawnConfetti(confettiLayer);
    spawnFire(fireLayer);
    const t1 = setTimeout(() => confettiLayer && spawnConfetti(confettiLayer), 500);
    const t2 = setTimeout(() => fireLayer && spawnFire(fireLayer), 400);
    const t3 = setTimeout(() => fireLayer && spawnFire(fireLayer), 800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "linear-gradient(145deg, #060612 0%, #0d0d22 50%, #060618 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "rgba(190,255,71,.22)",
          filter: "blur(100px)",
          top: "-100px",
          left: "-80px",
          animation: "mesh-drift 12s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 350,
          height: 350,
          borderRadius: "50%",
          background: "rgba(167,139,250,.18)",
          filter: "blur(100px)",
          bottom: "-60px",
          right: "-60px",
          animation: "mesh-drift 12s ease-in-out -5s infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 250,
          height: 250,
          borderRadius: "50%",
          background: "rgba(45,212,160,.15)",
          filter: "blur(80px)",
          top: "100px",
          right: "20px",
          animation: "mesh-drift 10s ease-in-out -9s infinite",
        }}
      />

      <div ref={confettiRef} style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }} />
      <div ref={fireRef} style={{ position: "absolute", bottom: 80, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 8, pointerEvents: "none" }} />

      <div
        style={{
          textAlign: "center",
          padding: "0 32px",
          zIndex: 2,
          animation: "celebration-in .7s cubic-bezier(.22,1,.36,1) .4s both",
        }}
      >
        <div
          style={{
            fontSize: 64,
            marginBottom: 16,
            display: "inline-block",
            animation: "float 3s ease-in-out infinite, bounce-in .6s cubic-bezier(.22,1,.36,1) .6s both",
            opacity: 0,
          }}
        >
          🔥
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            background: "rgba(255,181,71,.12)",
            border: "1px solid rgba(255,181,71,.25)",
            borderRadius: 999,
            padding: "5px 14px",
            marginBottom: 12,
            animation: "fade-slide-up .4s ease .8s both",
            opacity: 0,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#FFB547", animation: "pulse-glow 1.5s infinite" }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#FFB547", letterSpacing: ".08em", textTransform: "uppercase" }}>First meal logged!</span>
        </div>

        <h1
          style={{
            fontSize: 40,
            fontWeight: 800,
            color: "#F4F4FF",
            letterSpacing: "-.03em",
            lineHeight: 1.1,
            marginBottom: 8,
            animation: "fade-slide-up .4s ease .9s both",
            opacity: 0,
          }}
        >
          Streak starts
          <br />
          <span
            style={{
              background: "linear-gradient(135deg,#BEFF47,#A78BFA)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            now.
          </span>
        </h1>

        <p
          style={{
            fontSize: 14,
            color: "rgba(167,139,250,.8)",
            marginBottom: 24,
            animation: "fade-slide-up .4s ease 1s both",
            opacity: 0,
          }}
        >
          {Math.round(calories)} kcal · {Math.round(protein)}g protein · Day 1 ✨
        </p>

        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "center",
            marginBottom: 28,
            animation: "fade-slide-up .4s ease 1.1s both",
            opacity: 0,
          }}
        >
          {[
            { val: `${Math.round(calories).toLocaleString()}`, sub: "kcal", color: "#BEFF47" },
            { val: `${Math.round(protein)}g`, sub: "protein", color: "#2DD4A0" },
            { val: "Day 1", sub: "streak", color: "#FFB547" },
          ].map(({ val, sub, color }) => (
            <div key={sub} style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 18, padding: "14px 16px", textAlign: "center", flex: 1 }}>
              <p style={{ fontSize: 20, fontWeight: 800, color: color ?? "#fff" }}>{val}</p>
              <p style={{ fontSize: 10, color: "rgba(244,244,255,.45)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", marginTop: 2 }}>{sub}</p>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: 16,
            background: "linear-gradient(135deg, #BEFF47, #A78BFA)",
            color: "#fff",
            fontFamily: "var(--font-display)",
            fontSize: 16,
            fontWeight: 800,
            border: "none",
            borderRadius: 16,
            cursor: "pointer",
            letterSpacing: "-.01em",
            animation: "fade-slide-up .4s ease 1.2s both",
            opacity: 0,
            boxShadow: "0 8px 32px rgba(190,255,71,.35)",
          }}
        >
          Keep it up →
        </button>
      </div>
    </div>
  );
}

function spawnConfetti(container: HTMLDivElement) {
  const colors = ["#2563EB", "#F59E0B", "#16A34A", "#EC4899", "#8B5CF6", "#EF4444", "#06B6D4", "#F97316"];
  for (let i = 0; i < 50; i++) {
    const el = document.createElement("div");
    const size = 6 + Math.random() * 7;
    el.style.cssText = `
      position: absolute;
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 40}%;
      width: ${size}px;
      height: ${size}px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      border-radius: ${Math.random() > 0.5 ? "50%" : "2px"};
      animation: confetti-fall ${1200 + Math.random() * 1000}ms ease-in ${Math.random() * 600}ms forwards;
      pointer-events: none;
    `;
    container.appendChild(el);
    setTimeout(() => el.remove(), 2800);
  }
}

function spawnFire(layer: HTMLDivElement) {
  const fires = ["🔥", "🔥", "✨", "⚡", "🌟", "🔥", "💥"];
  fires.forEach((emoji, i) => {
    const el = document.createElement("div");
    el.textContent = emoji;
    el.style.cssText = `
      position: relative;
      font-size: ${16 + Math.random() * 16}px;
      animation: fire-rise ${900 + Math.random() * 500}ms ease-out ${i * 90}ms forwards;
      pointer-events: none;
    `;
    layer.appendChild(el);
    setTimeout(() => el.remove(), 1800);
  });
}
