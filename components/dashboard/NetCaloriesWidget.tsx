"use client";

import { Flame, Utensils } from "lucide-react";

type NetCaloriesWidgetProps = {
  caloriesConsumed: number;
  caloriesBurned: number;
};

export function NetCaloriesWidget({ caloriesConsumed, caloriesBurned }: NetCaloriesWidgetProps) {
  const netCalories = Math.round(caloriesConsumed - caloriesBurned);

  return (
    <section>
      <p className="mb-2 px-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
        Net Calories
      </p>
      <div className="premium-card rounded-[var(--radius-card)] p-4">
        <div className="grid grid-cols-2 gap-3 border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(190,255,71,.12)]">
              <Utensils size={14} className="text-[#BEFF47]" aria-hidden />
            </span>
            <div>
              <p className="text-[10px] text-[var(--muted)]">Food Consumed</p>
              <p className="num text-sm font-bold text-[var(--white)]">{Math.round(caloriesConsumed)} kcal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(255,181,71,.12)]">
              <Flame size={14} className="text-[#FFB547]" aria-hidden />
            </span>
            <div>
              <p className="text-[10px] text-[var(--muted)]">Workout Burned</p>
              <p className="num text-sm font-bold text-[var(--white)]">{caloriesBurned} kcal</p>
            </div>
          </div>
        </div>
        <div className="mt-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">Net Calories</p>
          <p className="num mt-1 text-2xl font-extrabold text-[var(--white)]">{netCalories} kcal</p>
        </div>
      </div>
    </section>
  );
}
