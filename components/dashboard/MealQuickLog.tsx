"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import type { LoggableMealTemplate, MacroSnapshot } from "@/lib/meal-templates";
import { normalizeMealType } from "@/lib/meal-templates";

const MEAL_TYPES = ["breakfast", "lunch", "snack", "dinner"] as const;

function labelMealType(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

type MealQuickLogProps = {
  templates: LoggableMealTemplate[];
  initialSlot: string;
  mealsLoggedToday: boolean;
  onLogged: (macros: MacroSnapshot, wasFirstToday: boolean) => void;
};

export function MealQuickLog({ templates, initialSlot, mealsLoggedToday, onLogged }: MealQuickLogProps) {
  const [mealType, setMealType] = useState(() => normalizeMealType(initialSlot));
  const [isLogging, setIsLogging] = useState(false);
  const [error, setError] = useState("");
  const [loggedToday, setLoggedToday] = useState(mealsLoggedToday);

  const templatesForSlot = useMemo(
    () => templates.filter((t) => t.mealType === mealType),
    [templates, mealType],
  );

  async function logTemplate(template: LoggableMealTemplate) {
    setIsLogging(true);
    setError("");
    try {
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          date: new Date().toISOString().split("T")[0],
          mealType: normalizeMealType(template.mealType),
          items: [],
          macros: {
            calories: template.calories,
            protein: template.protein,
            carbs: template.carbs,
            fat: template.fat,
          },
        }),
      });
      if (!res.ok) throw new Error("save failed");
      const wasFirstToday = !loggedToday;
      if (wasFirstToday) setLoggedToday(true);
      onLogged(
        {
          calories: template.calories,
          protein: template.protein,
          carbs: template.carbs,
          fat: template.fat,
        },
        wasFirstToday,
      );
    } catch {
      setError("Could not log meal. Try the Calories tab.");
    } finally {
      setIsLogging(false);
    }
  }

  return (
    <section>
      <div className="mb-2 flex items-center justify-between px-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Quick log meal</p>
        <Link href={`/meals?slot=${mealType}`} className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#B8E86A]">
          All templates
          <ChevronRight size={12} aria-hidden />
        </Link>
      </div>

      <div className="premium-card rounded-[var(--radius-card)] p-3">
        <div className="flex gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
          {MEAL_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setMealType(type)}
              className={`flex-1 rounded-[10px] py-1.5 text-[10px] font-semibold transition-all ${
                mealType === type ? "bg-[#BEFF47] text-[#06080A]" : "text-[var(--muted)]"
              }`}
            >
              {labelMealType(type)}
            </button>
          ))}
        </div>

        {templatesForSlot.length === 0 ? (
          <p className="mt-3 text-center text-[11px] text-[var(--muted)]">
            No templates for {labelMealType(mealType)}.{" "}
            <Link href={`/meals?slot=${mealType}`} className="font-semibold text-[#B8E86A]">
              Create one
            </Link>
          </p>
        ) : (
          <div className="mt-2.5 flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {templatesForSlot.map((template) => (
              <button
                key={template.id}
                type="button"
                disabled={isLogging}
                onClick={() => void logTemplate(template)}
                className="min-w-[9.5rem] shrink-0 rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 text-left transition-transform active:scale-[0.98] disabled:opacity-50"
              >
                <div className="flex items-start justify-between gap-1">
                  <p className="line-clamp-2 text-[12px] font-semibold leading-snug text-[var(--white)]">{template.name}</p>
                  <span
                    className={`shrink-0 rounded-md px-1 py-0.5 text-[8px] font-semibold ${
                      template.source === "saved"
                        ? "bg-[rgba(87,180,255,.14)] text-[#57B4FF]"
                        : "bg-[rgba(190,255,71,.12)] text-[#B8E86A]"
                    }`}
                  >
                    {template.source === "saved" ? "Yours" : "Daily"}
                  </span>
                </div>
                <p className="num mt-1.5 text-base font-bold text-[#BEFF47]">{template.calories}</p>
                <p className="text-[9px] text-[var(--muted)]">kcal · tap to log</p>
              </button>
            ))}
          </div>
        )}

        {error ? <p className="mt-2 text-[11px] text-red-400">{error}</p> : null}
      </div>
    </section>
  );
}
