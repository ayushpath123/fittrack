"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { MealTypeTabs } from "@/components/meal-templates/MealTypeTabs";
import { TemplateLogSheet } from "@/components/meal-templates/TemplateLogSheet";
import toast from "react-hot-toast";
import { filterTemplatesByMealType, labelMealType, normalizeMealType, sortFrequentlyUsed } from "@/lib/meal-templates";
import type { MacroSnapshot } from "@/lib/meal-templates";
import type { MealTemplate, MealType } from "@/types/meal-template";

type MealQuickLogProps = {
  templates: MealTemplate[];
  initialSlot: string;
  mealsLoggedToday: boolean;
  onLogged: (macros: MacroSnapshot, wasFirstToday: boolean) => void;
};

export function MealQuickLog({ templates, initialSlot, mealsLoggedToday, onLogged }: MealQuickLogProps) {
  const [mealType, setMealType] = useState<MealType>(() => normalizeMealType(initialSlot));
  const [selected, setSelected] = useState<MealTemplate | null>(null);
  const [loggedToday, setLoggedToday] = useState(mealsLoggedToday);

  const templatesForSlot = useMemo(() => filterTemplatesByMealType(templates, mealType), [templates, mealType]);
  const frequent = useMemo(
    () => sortFrequentlyUsed(templatesForSlot).slice(0, 4),
    [templatesForSlot],
  );

  async function logTemplate(payload: { servings: number; macros: MacroSnapshot; mealType: MealType }) {
    if (!selected) return false;
    try {
      const res = await fetch(`/api/meal-templates/${selected.id}/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          date: new Date().toISOString().split("T")[0],
          mealType: payload.mealType,
          servings: payload.servings,
          macros: payload.macros,
        }),
      });
      if (!res.ok) throw new Error("save failed");
      const wasFirstToday = !loggedToday;
      if (wasFirstToday) setLoggedToday(true);
      onLogged(payload.macros, wasFirstToday);
      toast.success("Meal logged successfully");
      return true;
    } catch {
      toast.error("Could not log meal. Try the Calories tab.");
      return false;
    }
  }

  return (
    <section>
      <div className="mb-2 flex items-center justify-between px-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Quick log meal</p>
        <Link href={`/meals?action=add&slot=${mealType}`} className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#B8E86A]">
          Add meal
          <ChevronRight size={12} aria-hidden />
        </Link>
      </div>

      <div className="premium-card rounded-[var(--radius-card)] p-3">
        <MealTypeTabs value={mealType} onChange={setMealType} size="sm" />

        {frequent.length === 0 ? (
          <div className="mt-3 text-center">
            <p className="text-[11px] text-[var(--muted)]">
              No {labelMealType(mealType)} templates yet.
            </p>
            <Link
              href="/meals/templates"
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#B8E86A]"
            >
              <Plus size={12} />
              Create template
            </Link>
          </div>
        ) : (
          <div className="mt-2.5 flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {frequent.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => setSelected(template)}
                className="min-w-[9.5rem] shrink-0 rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 text-left transition-transform active:scale-[0.98]"
              >
                <p className="line-clamp-2 text-[12px] font-semibold leading-snug text-[var(--white)]">{template.name}</p>
                <p className="num mt-1.5 text-base font-bold text-[#BEFF47]">{template.calories}</p>
                <p className="text-[9px] text-[var(--muted)]">kcal · tap to log</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <TemplateLogSheet
        open={Boolean(selected)}
        template={selected}
        mealType={mealType}
        onClose={() => setSelected(null)}
        onLog={logTemplate}
      />
    </section>
  );
}
