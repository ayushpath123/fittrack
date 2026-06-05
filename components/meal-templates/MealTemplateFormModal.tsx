"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MEAL_TYPES, labelMealType } from "@/lib/meal-templates";
import type { MealTemplate, MealTemplateInput, MealType } from "@/types/meal-template";

type MealTemplateFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (input: MealTemplateInput) => Promise<boolean>;
  initial?: MealTemplate | null;
  defaultMealType?: MealType;
};

const emptyForm: MealTemplateInput = {
  name: "",
  mealType: "breakfast",
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
};

function parseNumber(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

export function MealTemplateFormModal({
  open,
  onClose,
  onSave,
  initial,
  defaultMealType = "breakfast",
}: MealTemplateFormModalProps) {
  const [form, setForm] = useState<MealTemplateInput>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof MealTemplateInput, string>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        name: initial.name,
        mealType: initial.mealType,
        calories: initial.calories,
        protein: initial.protein,
        carbs: initial.carbs,
        fat: initial.fat,
      });
    } else {
      setForm({ ...emptyForm, mealType: defaultMealType });
    }
    setErrors({});
  }, [open, initial, defaultMealType]);

  function validate(): boolean {
    const next: Partial<Record<keyof MealTemplateInput, string>> = {};
    if (!form.name.trim()) next.name = "Name is required";
    if (!form.mealType) next.mealType = "Meal type is required";
    if (!Number.isFinite(form.calories)) next.calories = "Calories required";
    if (!Number.isFinite(form.protein)) next.protein = "Protein required";
    if (!Number.isFinite(form.carbs)) next.carbs = "Carbs required";
    if (!Number.isFinite(form.fat)) next.fat = "Fat required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    const ok = await onSave(form);
    setSaving(false);
    if (ok) onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={initial ? "Edit template" : "Create template"}
        className="relative z-10 w-full max-w-md rounded-t-[1.35rem] border border-white/10 bg-[rgba(12,14,22,.98)] p-4 shadow-2xl sm:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--white)]">
            {initial ? "Edit Template" : "Create Template"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-[var(--muted)]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <Input
            label="Template Name"
            tone="glass"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            error={errors.name}
            placeholder="e.g. Protein Oats Bowl"
          />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[var(--muted)]">Meal Type</label>
            <select
              value={form.mealType}
              onChange={(e) => setForm((p) => ({ ...p, mealType: e.target.value as MealType }))}
              className="w-full rounded-xl border border-white/12 bg-white/[0.06] px-4 py-3 text-sm text-white focus:border-[#BEFF47]/35 focus:outline-none"
            >
              {MEAL_TYPES.map((type) => (
                <option key={type} value={type} className="bg-[#12141c]">
                  {labelMealType(type)}
                </option>
              ))}
            </select>
            {errors.mealType ? <p className="text-xs text-red-400">{errors.mealType}</p> : null}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["Calories", "calories", "kcal"],
                ["Protein", "protein", "g"],
                ["Carbs", "carbs", "g"],
                ["Fat", "fat", "g"],
              ] as const
            ).map(([label, key, unit]) => (
              <Input
                key={key}
                label={`${label} (${unit})`}
                tone="glass"
                type="number"
                inputMode="decimal"
                min={0}
                value={form[key]}
                onChange={(e) => setForm((p) => ({ ...p, [key]: parseNumber(e.target.value) }))}
                error={errors[key]}
              />
            ))}
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={() => void handleSave()} isLoading={saving} loadingText="Saving…">
            Save Template
          </Button>
        </div>
      </div>
    </div>
  );
}
