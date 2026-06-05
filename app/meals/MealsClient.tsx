"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, Camera, Plus, Settings2 } from "lucide-react";
import toast from "react-hot-toast";
import { AddMealFlow } from "@/components/meal-templates/AddMealFlow";
import { MealTypeTabs } from "@/components/meal-templates/MealTypeTabs";
import { TemplateLogSheet } from "@/components/meal-templates/TemplateLogSheet";
import { MealCard } from "@/components/MealCard";
import { SectionHeader } from "@/components/SectionHeader";
import { FirstLogCelebration } from "@/components/FirstLogCelebration";
import { Button } from "@/components/ui/Button";
import {
  detectMealTypeFromTime,
  filterTemplatesByMealType,
  labelMealType,
  normalizeMealType,
} from "@/lib/meal-templates";
import type { MacroSnapshot } from "@/lib/meal-templates";
import type { MealEntryType } from "@/types";
import type { MealTemplate, MealType } from "@/types/meal-template";

type MealsClientProps = {
  initialEntries: MealEntryType[];
  templates: MealTemplate[];
  targets: MacroSnapshot;
  initialSlot?: string;
  streakAfterFirstLogToday: number;
  openAddMeal?: boolean;
};

export function MealsClient({
  initialEntries,
  templates: initialTemplates,
  targets,
  initialSlot,
  streakAfterFirstLogToday,
  openAddMeal = false,
}: MealsClientProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [templates, setTemplates] = useState(initialTemplates);
  const [mealType, setMealType] = useState<MealType>(() =>
    initialSlot ? normalizeMealType(initialSlot) : detectMealTypeFromTime(),
  );
  const [addMealOpen, setAddMealOpen] = useState(openAddMeal);
  const [quickLogTemplate, setQuickLogTemplate] = useState<MealTemplate | null>(null);
  const [celebration, setCelebration] = useState<{ calories: number; protein: number; streakDays: number } | null>(null);

  useEffect(() => {
    if (openAddMeal) setAddMealOpen(true);
  }, [openAddMeal]);

  const totals = useMemo(
    () => ({
      calories: entries.reduce((s, e) => s + e.totalCalories, 0),
      protein: entries.reduce((s, e) => s + e.totalProtein, 0),
      carbs: entries.reduce((s, e) => s + (e.totalCarbs ?? 0), 0),
      fat: entries.reduce((s, e) => s + (e.totalFat ?? 0), 0),
    }),
    [entries],
  );

  const remaining = useMemo(
    () => ({
      calories: Math.max(0, Math.round(targets.calories - totals.calories)),
      protein: Math.max(0, Math.round(targets.protein - totals.protein)),
      carbs: Math.max(0, Math.round(targets.carbs - totals.carbs)),
      fat: Math.max(0, Math.round(targets.fat - totals.fat)),
    }),
    [targets, totals],
  );

  const templatesForSlot = useMemo(
    () => filterTemplatesByMealType(templates, mealType),
    [templates, mealType],
  );

  const sortedEntries = [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  function handleLogged(entry: MealEntryType, macros: MacroSnapshot, templateId?: string) {
    const wasFirstToday = entries.length === 0;
    setEntries((prev) => [...prev, entry]);
    if (templateId) {
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === templateId
            ? { ...t, useCount: t.useCount + 1, lastUsedAt: new Date().toISOString() }
            : t,
        ),
      );
    }
    if (wasFirstToday) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("fittrack-first-log-done", "1");
      }
      setCelebration({
        calories: macros.calories,
        protein: macros.protein,
        streakDays: streakAfterFirstLogToday,
      });
    } else {
      toast.success("Meal logged successfully");
    }
  }

  async function logFromSheet(payload: {
    servings: number;
    macros: MacroSnapshot;
    mealType: MealType;
  }): Promise<boolean> {
    if (!quickLogTemplate) return false;
    try {
      const res = await fetch(`/api/meal-templates/${quickLogTemplate.id}/log`, {
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
      if (!res.ok) {
        toast.error("Could not log meal.");
        return false;
      }
      const entry = (await res.json()) as MealEntryType;
      handleLogged(
        {
          ...entry,
          date: String(entry.date),
          totalCarbs: entry.totalCarbs ?? payload.macros.carbs,
          totalFat: entry.totalFat ?? payload.macros.fat,
        },
        payload.macros,
        quickLogTemplate.id,
      );
      setQuickLogTemplate(null);
      return true;
    } catch {
      toast.error("Could not log meal.");
      return false;
    }
  }

  async function deleteMeal(id: string) {
    const res = await fetch(`/api/meals/${id}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) {
      toast.error("Could not delete meal.");
      return;
    }
    setEntries((prev) => prev.filter((e) => e.id !== id));
    toast.success("Meal removed");
  }

  return (
    <div className="space-y-4 pb-24">
      {celebration ? (
        <FirstLogCelebration
          calories={celebration.calories}
          protein={celebration.protein}
          streakDays={celebration.streakDays}
          onClose={() => setCelebration(null)}
        />
      ) : null}

      <SectionHeader
        eyebrow="Daily nutrition"
        title="Calories"
        subtitle="Log meals in seconds with your saved templates."
        action={
          <div className="flex gap-1.5">
            <Link
              href="/meals/templates"
              className="inline-flex min-h-10 items-center rounded-xl border border-white/12 bg-white/[0.05] px-2.5 text-[var(--muted)]"
              aria-label="Meal templates"
            >
              <BookOpen size={16} />
            </Link>
            <Link
              href="/settings"
              className="inline-flex min-h-10 items-center rounded-xl border border-white/12 bg-white/[0.05] px-2.5 text-[var(--muted)]"
              aria-label="Edit targets"
            >
              <Settings2 size={16} />
            </Link>
            <Link
              href="/meals/ai"
              className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-[rgba(190,255,71,.32)] bg-[rgba(190,255,71,.12)] px-3 py-1.5 text-xs font-semibold text-[#B8E86A]"
            >
              <Camera size={14} />
              AI
            </Link>
          </div>
        }
      />

      <Button className="w-full" icon={<Plus size={16} />} onClick={() => setAddMealOpen(true)}>
        Add Meal
      </Button>

      <div className="premium-card rounded-2xl p-3.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">Today vs targets</p>
        <div className="mt-2 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
          {(
            [
              ["Cal", totals.calories, targets.calories, remaining.calories, "kcal"],
              ["Protein", totals.protein, targets.protein, remaining.protein, "g"],
              ["Carbs", totals.carbs, targets.carbs, remaining.carbs, "g"],
              ["Fat", totals.fat, targets.fat, remaining.fat, "g"],
            ] as const
          ).map(([label, done, target, left, unit]) => (
            <div key={label} className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-2 py-2">
              <p className="text-[9px] uppercase tracking-wide text-[var(--hint)]">{label}</p>
              <p className="mt-0.5 text-sm font-bold text-[var(--white)]">
                {Math.round(done)}
                <span className="text-[10px] font-medium text-[var(--muted)]">
                  {" "}
                  / {target}
                  {unit === "kcal" ? "" : unit}
                </span>
              </p>
              <p className="text-[10px] text-[#B8E86A]">{left} left</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">Quick templates</p>
          <Link href="/meals/templates" className="text-[10px] font-semibold text-[#B8E86A]">
            Manage
          </Link>
        </div>
        <MealTypeTabs value={mealType} onChange={setMealType} />
        {templatesForSlot.length === 0 ? (
          <p className="mt-3 text-xs text-[var(--muted)]">
            No {labelMealType(mealType)} templates yet.{" "}
            <Link href="/meals/templates" className="font-semibold text-[#B8E86A]">
              Create one
            </Link>
          </p>
        ) : (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {templatesForSlot.slice(0, 4).map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => setQuickLogTemplate(template)}
                className="premium-card rounded-xl p-3 text-left transition-transform active:scale-[0.98]"
              >
                <p className="text-sm font-semibold text-[var(--white)]">{template.name}</p>
                <p className="mt-1 text-lg font-bold text-[#BEFF47]">{template.calories} kcal</p>
                <p className="mt-0.5 text-[10px] text-[var(--muted)]">
                  P {template.protein}g · C {template.carbs}g · F {template.fat}g
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)]">Logged today</p>
        {sortedEntries.map((entry) => (
          <MealCard
            key={entry.id}
            mealType={entry.mealType}
            items={[{ emoji: "🍽️" }]}
            description={labelMealType(entry.mealType)}
            calories={entry.totalCalories}
            protein={entry.totalProtein}
            color="green"
            time={new Date(entry.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            onDelete={() => void deleteMeal(entry.id)}
          />
        ))}
        {sortedEntries.length === 0 ? (
          <div className="premium-card rounded-2xl p-6 text-center">
            <p className="text-sm font-semibold text-[var(--white)]">Nothing logged yet</p>
            <p className="mt-1 text-xs text-[var(--muted)]">Tap Add Meal to log from a template in under 5 seconds.</p>
            <button
              type="button"
              onClick={() => setAddMealOpen(true)}
              className="mt-3 inline-flex rounded-xl border border-[rgba(190,255,71,.35)] bg-[rgba(190,255,71,.12)] px-3 py-1.5 text-xs font-semibold text-[#B8E86A]"
            >
              Add Meal
            </button>
          </div>
        ) : null}
      </div>

      <AddMealFlow
        open={addMealOpen}
        onClose={() => setAddMealOpen(false)}
        templates={templates}
        onLogged={(entry, macros) => handleLogged(entry, macros)}
        onTemplatesChange={setTemplates}
        initialMealType={mealType}
      />

      <TemplateLogSheet
        open={Boolean(quickLogTemplate)}
        template={quickLogTemplate}
        mealType={mealType}
        onClose={() => setQuickLogTemplate(null)}
        onLog={logFromSheet}
      />
    </div>
  );
}
