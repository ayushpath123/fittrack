"use client";

import { useState } from "react";
import { Droplets } from "lucide-react";

type Props = {
  dateKey: string;
  goalMl: number;
  initialTotalMl: number;
};

export function HydrationWidget({ dateKey, goalMl, initialTotalMl }: Props) {
  const [totalMl, setTotalMl] = useState(initialTotalMl);
  const [pending, setPending] = useState(false);

  async function add(ml: number) {
    setPending(true);
    try {
      const res = await fetch("/api/hydration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ addMl: ml, date: dateKey }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { totalMl: number; goalMl: number };
      setTotalMl(data.totalMl);
    } finally {
      setPending(false);
    }
  }

  const pct = goalMl > 0 ? Math.min(100, Math.round((totalMl / goalMl) * 100)) : 0;

  return (
    <div className="premium-card space-y-3 rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--white)]">
          <Droplets size={18} className="shrink-0 text-[#57B4FF]" aria-hidden />
          Hydration
        </div>
        <p className="text-xs text-[var(--muted)]">
          {totalMl} / {goalMl} ml
        </p>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[rgba(255,255,255,.12)]">
        <div className="h-full rounded-full bg-[#57B4FF] transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex gap-2">
        {[250, 500].map((ml) => (
          <button
            key={ml}
            type="button"
            disabled={pending}
            onClick={() => add(ml)}
            className="flex-1 rounded-xl border py-2 text-xs font-semibold transition-transform disabled:opacity-50 active:scale-95"
            style={{ borderColor: "rgba(87,180,255,.28)", background: "rgba(87,180,255,.12)", color: "#57B4FF" }}
          >
            +{ml} ml
          </button>
        ))}
      </div>
    </div>
  );
}
