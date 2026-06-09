"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import toast from "react-hot-toast";
import { MealTemplateCard } from "@/components/meal-templates/MealTemplateCard";
import { MealTypeTabs } from "@/components/meal-templates/MealTypeTabs";
import {
  detectMealTypeFromTime,
  filterTemplatesByMealType,
  searchTemplates,
  sortFrequentlyUsed,
} from "@/lib/meal-templates";
import type { MacroSnapshot } from "@/lib/meal-templates";
import { toLocalDateKey } from "@/lib/date";
import type { MealEntryType } from "@/types";
import type { MealTemplate, MealType } from "@/types/meal-template";
import { BottomSheet } from "@/components/meal-templates/BottomSheet";

type AddMealFlowProps = {
  open: boolean;
  onClose: () => void;
  templates: MealTemplate[];
  onLogged: (entry: MealEntryType, macros: MacroSnapshot, templateId?: string) => void;
  onTemplatesChange?: (templates: MealTemplate[]) => void;
  initialMealType?: MealType;
};

export function AddMealFlow({
  open,
  onClose,
  templates,
  onLogged,
  onTemplatesChange,
  initialMealType,
}: AddMealFlowProps) {
  const [mealType, setMealType] = useState<MealType>(initialMealType ?? detectMealTypeFromTime());
  const [search, setSearch] = useState("");
  const [loggingId, setLoggingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMealType(initialMealType ?? detectMealTypeFromTime());
    setSearch("");
    setLoggingId(null);
  }, [open, initialMealType]);

  const frequentlyUsed = useMemo(() => sortFrequentlyUsed(templates).slice(0, 6), [templates]);

  const matchingTemplates = useMemo(() => {
    const byType = filterTemplatesByMealType(templates, mealType);
    return searchTemplates(byType, search);
  }, [templates, mealType, search]);

  const frequentForSlot = useMemo(
    () => frequentlyUsed.filter((t) => t.mealType === mealType && t.name.toLowerCase().includes(search.trim().toLowerCase())),
    [frequentlyUsed, mealType, search],
  );

  async function logTemplate(template: MealTemplate) {
    if (loggingId) return;
    setLoggingId(template.id);
    const macros: MacroSnapshot = {
      calories: template.calories,
      protein: template.protein,
      carbs: template.carbs,
      fat: template.fat,
    };
    try {
      const res = await fetch(`/api/meal-templates/${template.id}/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          date: toLocalDateKey(new Date()),
          mealType,
          servings: 1,
          macros,
        }),
      });
      if (res.status === 401) {
        toast.error("Session expired. Please sign in again.");
        return;
      }
      if (!res.ok) {
        toast.error("Could not log meal. Please retry.");
        return;
      }
      const entry = (await res.json()) as MealEntryType;
      onLogged(
        {
          ...entry,
          date: String(entry.date),
          totalCarbs: entry.totalCarbs ?? macros.carbs,
          totalFat: entry.totalFat ?? macros.fat,
        },
        macros,
        template.id,
      );
      onTemplatesChange?.(
        templates.map((t) =>
          t.id === template.id
            ? {
                ...t,
                useCount: t.useCount + 1,
                lastUsedAt: new Date().toISOString(),
              }
            : t,
        ),
      );
      onClose();
    } catch {
      toast.error("Could not log meal. Please retry.");
    } finally {
      setLoggingId(null);
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Add Meal">
      <p className="mb-3 text-xs text-[var(--muted)]">Select meal type, then tap a template to log instantly.</p>

      <MealTypeTabs value={mealType} onChange={setMealType} />

      <div className="relative mt-3">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--hint)]" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search templates…"
          className="w-full rounded-xl border border-white/12 bg-white/[0.05] py-2.5 pl-9 pr-3 text-sm text-[var(--white)] placeholder:text-[var(--hint)] focus:border-[#BEFF47]/35 focus:outline-none"
        />
      </div>

      {frequentForSlot.length > 0 ? (
        <div className="mt-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">
            Frequently Used
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {frequentForSlot.map((template) => {
              const busy = loggingId === template.id;
              return (
                <button
                  key={`freq-${template.id}`}
                  type="button"
                  disabled={Boolean(loggingId)}
                  onClick={() => void logTemplate(template)}
                  className="min-w-[8.5rem] shrink-0 rounded-xl border border-[rgba(190,255,71,.2)] bg-[rgba(190,255,71,.08)] p-2.5 text-left active:scale-[0.98] disabled:opacity-60"
                >
                  <p className="line-clamp-2 text-[11px] font-semibold text-[var(--white)]">{template.name}</p>
                  <p className="mt-1 text-sm font-bold text-[#BEFF47]">
                    {busy ? <Loader2 size={14} className="inline animate-spin" /> : `${template.calories} kcal`}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-4 space-y-2 pb-1">
        {matchingTemplates.length === 0 ? (
          <p className="py-6 text-center text-xs text-[var(--muted)]">
            No {mealType} templates found. Create one in Meal Templates.
          </p>
        ) : (
          matchingTemplates.map((template) => (
            <MealTemplateCard
              key={template.id}
              template={template}
              onSelect={() => void logTemplate(template)}
              compact
              disabled={Boolean(loggingId)}
              loading={loggingId === template.id}
            />
          ))
        )}
      </div>
    </BottomSheet>
  );
}
