"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Camera, Settings2 } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { MealCard } from "@/components/MealCard";
import { SectionHeader } from "@/components/SectionHeader";
import { Toast } from "@/components/Toast";
import { FirstLogCelebration } from "@/components/FirstLogCelebration";
import type { LoggableMealTemplate, MacroSnapshot } from "@/lib/meal-templates";
import { normalizeMealType } from "@/lib/meal-templates";

type MealTemplateRow = {
  id: string;
  name: string;
  mealType: string | null;
  items: unknown;
};
import type { MealEntryType } from "@/types";

const MEAL_TYPES = ["breakfast", "lunch", "snack", "dinner"] as const;

function labelMealType(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function mealTypeFromHour(hour: number) {
  if (hour < 11) return "breakfast";
  if (hour < 15) return "lunch";
  if (hour < 18) return "snack";
  return "dinner";
}

function resolveInitialMealType(initialSlot?: string) {
  if (initialSlot && MEAL_TYPES.includes(initialSlot as (typeof MEAL_TYPES)[number])) {
    return initialSlot;
  }
  return mealTypeFromHour(new Date().getHours());
}

export function MealsClient({
  initialEntries,
  logTemplates,
  targets,
  initialSlot,
  streakAfterFirstLogToday,
}: {
  initialEntries: MealEntryType[];
  logTemplates: LoggableMealTemplate[];
  targets: MacroSnapshot;
  initialSlot?: string;
  streakAfterFirstLogToday: number;
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [templates, setTemplates] = useState(logTemplates);
  const [mealType, setMealType] = useState(() => resolveInitialMealType(initialSlot));
  const [custom, setCustom] = useState<MacroSnapshot>({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [customOpen, setCustomOpen] = useState(false);
  const [saveTemplate, setSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [celebration, setCelebration] = useState<{ calories: number; protein: number; streakDays: number } | null>(null);

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
    () => templates.filter((t) => t.mealType === mealType),
    [templates, mealType],
  );

  function addSavedTemplate(row: MealTemplateRow, macros: MacroSnapshot) {
    const slot = normalizeMealType(row.mealType);
    setTemplates((prev) => {
      const next: LoggableMealTemplate = {
        id: row.id,
        name: row.name,
        mealType: slot,
        source: "saved",
        ...macros,
      };
      return [...prev.filter((t) => t.id !== row.id), next];
    });
  }

  async function readApiError(res: Response, fallback: string) {
    try {
      const body = (await res.json()) as { error?: string };
      return body.error ?? fallback;
    } catch {
      return fallback;
    }
  }

  const sortedEntries = [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  function openCustomWithRemaining() {
    setCustom({ ...remaining });
    setCustomOpen(true);
  }

  async function persistMacros(macros: MacroSnapshot, type: string, label: string): Promise<boolean> {
    setIsSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          date: new Date().toISOString().split("T")[0],
          mealType: normalizeMealType(type),
          items: [],
          macros,
        }),
      });
      if (res.status === 401) {
        setError("Session expired. Please sign in again.");
        return false;
      }
      if (!res.ok) {
        setError(await readApiError(res, "Could not log meal. Please retry."));
        return false;
      }
      const saved = (await res.json()) as MealEntryType;
      const wasFirstToday = entries.length === 0;
      setEntries((prev) => [
        ...prev,
        {
          ...saved,
          date: String(saved.date),
          items: [],
          totalCarbs: saved.totalCarbs ?? macros.carbs,
          totalFat: saved.totalFat ?? macros.fat,
        },
      ]);
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
        setSuccess(`${label} logged — ${Math.round(macros.calories)} kcal`);
      }
      setCustomOpen(false);
      return true;
    } catch {
      setError("Could not log meal. Please retry.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function saveTemplateOnly(macros: MacroSnapshot, slot: string, name: string): Promise<boolean> {
    const res = await fetch("/api/food", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name: name.trim(),
        mealType: normalizeMealType(slot),
        macros,
      }),
    });
    if (res.status === 401) {
      setError("Session expired. Please sign in again.");
      return false;
    }
    if (!res.ok) {
      setError(await readApiError(res, "Could not save template."));
      return false;
    }
    const created = (await res.json()) as MealTemplateRow;
    addSavedTemplate(created, macros);
    return true;
  }

  async function logTemplate(template: LoggableMealTemplate) {
    await persistMacros(
      {
        calories: template.calories,
        protein: template.protein,
        carbs: template.carbs,
        fat: template.fat,
      },
      template.mealType,
      template.name,
    );
  }

  async function logCustom() {
    if (custom.calories <= 0) {
      setError("Enter calories (kcal) for this meal.");
      return;
    }
    if (saveTemplate && templateName.trim().length < 2) {
      setError("Enter a template name (at least 2 characters) or uncheck save template.");
      return;
    }

    const logged = await persistMacros(custom, mealType, labelMealType(mealType));
    if (!logged) return;

    if (saveTemplate) {
      setIsSaving(true);
      try {
        const saved = await saveTemplateOnly(custom, mealType, templateName);
        if (saved) {
          setSuccess(`${labelMealType(mealType)} logged. "${templateName.trim()}" saved — tap it next time.`);
          setSaveTemplate(false);
          setTemplateName("");
        }
      } finally {
        setIsSaving(false);
      }
    }
  }

  async function saveTemplateWithoutLog() {
    if (custom.calories <= 0) {
      setError("Enter calories (kcal) for the template.");
      return;
    }
    if (templateName.trim().length < 2) {
      setError("Enter a template name (at least 2 characters).");
      return;
    }
    setIsSaving(true);
    setError("");
    setSuccess("");
    try {
      const saved = await saveTemplateOnly(custom, mealType, templateName);
      if (saved) {
        setSuccess(`"${templateName.trim()}" saved — tap it above to log in one step.`);
        setSaveTemplate(false);
        setTemplateName("");
        setCustomOpen(false);
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteMeal(id: string) {
    setError("");
    const res = await fetch(`/api/meals/${id}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) return setError("Could not delete meal.");
    setEntries((prev) => prev.filter((e) => e.id !== id));
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
        subtitle="Tap a template — adjust numbers only if you need to."
        action={
          <div className="flex gap-1.5">
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
                <span className="text-[10px] font-medium text-[var(--muted)]"> / {target}{unit === "kcal" ? "" : unit}</span>
              </p>
              <p className="text-[10px] text-[#B8E86A]">{left} left</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">Meal slot</p>
        <div className="flex gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
          {MEAL_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setMealType(type)}
              className={`flex-1 rounded-[10px] py-2 text-[11px] font-semibold transition-all ${
                mealType === type ? "bg-[#BEFF47] text-[#06080A]" : "text-[var(--muted)]"
              }`}
            >
              {labelMealType(type)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">
          Templates for {labelMealType(mealType)}
        </p>
        {templatesForSlot.length === 0 ? (
          <p className="text-xs text-[var(--muted)]">No templates for this slot. Use adjust numbers below.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {templatesForSlot.map((template) => (
              <button
                key={template.id}
                type="button"
                disabled={isSaving}
                onClick={() => void logTemplate(template)}
                className="premium-card rounded-xl p-3.5 text-left transition-transform active:scale-[0.98] disabled:opacity-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-[var(--white)]">{template.name}</p>
                  <span className="shrink-0 rounded-md bg-[rgba(190,255,71,.12)] px-1.5 py-0.5 text-[9px] font-semibold text-[#B8E86A]">
                    {template.source === "preset" ? "Daily" : "Saved"}
                  </span>
                </div>
                <p className="mt-2 text-lg font-bold text-[#BEFF47]">{template.calories} kcal</p>
                <p className="mt-1 text-[11px] text-[var(--muted)]">
                  P {template.protein}g · C {template.carbs}g · F {template.fat}g
                </p>
                <p className="mt-2 text-[10px] font-semibold text-[var(--hint)]">Tap to log</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="premium-card rounded-2xl p-4">
        <button
          type="button"
          onClick={() => (customOpen ? setCustomOpen(false) : openCustomWithRemaining())}
          className="flex w-full items-center justify-between text-left"
        >
          <div>
            <p className="text-sm font-semibold text-[var(--white)]">Adjust numbers</p>
            <p className="text-[11px] text-[var(--muted)]">Prefilled with what&apos;s left today</p>
          </div>
          <span className="text-xs font-semibold text-[#B8E86A]">{customOpen ? "Hide" : "Adjust"}</span>
        </button>

        {customOpen ? (
          <div className="mt-3 space-y-3 border-t border-white/[0.08] pt-3">
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["Calories", "calories", "kcal"],
                  ["Protein", "protein", "g"],
                  ["Carbs", "carbs", "g"],
                  ["Fat", "fat", "g"],
                ] as const
              ).map(([label, key, unit]) => (
                <label key={key} className="block">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                    {label} ({unit})
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={custom[key]}
                    onChange={(e) =>
                      setCustom((prev) => ({
                        ...prev,
                        [key]: Math.max(0, Number(e.target.value) || 0),
                      }))
                    }
                    className="metric-value mt-1 w-full rounded-xl border border-white/12 bg-white/[0.05] px-3 py-2 text-sm font-semibold text-[var(--white)] focus:border-[#BEFF47]/40 focus:outline-none"
                  />
                </label>
              ))}
            </div>

            <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
              <input
                type="checkbox"
                checked={saveTemplate}
                onChange={(e) => setSaveTemplate(e.target.checked)}
                className="rounded border-white/20"
              />
              Save as reusable template
            </label>
            {saveTemplate ? (
              <input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Template name (e.g. Office lunch)"
                className="w-full rounded-xl border border-white/12 bg-white/[0.05] px-3 py-2 text-sm text-[var(--white)] focus:outline-none"
              />
            ) : null}

            <button
              type="button"
              disabled={isSaving}
              onClick={() => void logCustom()}
              className="w-full rounded-xl bg-[#BEFF47] py-3 text-sm font-semibold text-[#06080A] disabled:opacity-40"
            >
              {isSaving ? "Saving…" : `Log ${labelMealType(mealType)}`}
            </button>
            {saveTemplate ? (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => void saveTemplateWithoutLog()}
                className="w-full rounded-xl border border-white/12 py-2.5 text-sm font-semibold text-[var(--white)] disabled:opacity-40"
              >
                Save template only
              </button>
            ) : null}
          </div>
        ) : null}
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
            onDelete={() => deleteMeal(entry.id)}
          />
        ))}
        {sortedEntries.length === 0 ? (
          <EmptyState
            title="Nothing logged yet"
            subtitle="Tap a template above to log your target macros in one step."
          />
        ) : null}
      </div>

      <Toast message={error} type="error" />
      <Toast message={success} type="info" />
    </div>
  );
}
