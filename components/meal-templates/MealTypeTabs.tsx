"use client";

import { MEAL_TYPES, labelMealType } from "@/lib/meal-templates";
import type { MealType } from "@/types/meal-template";
import { cn } from "@/lib/utils";

type MealTypeTabsProps = {
  value: MealType;
  onChange: (value: MealType) => void;
  size?: "sm" | "md";
  className?: string;
};

export function MealTypeTabs({ value, onChange, size = "md", className }: MealTypeTabsProps) {
  return (
    <div className={cn("flex gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1", className)}>
      {MEAL_TYPES.map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => onChange(type)}
          className={cn(
            "flex-1 rounded-[10px] font-semibold transition-all",
            size === "sm" ? "py-1.5 text-[10px]" : "py-2 text-[11px]",
            value === type ? "bg-[#BEFF47] text-[#06080A]" : "text-[var(--muted)]",
          )}
        >
          {labelMealType(type)}
        </button>
      ))}
    </div>
  );
}
