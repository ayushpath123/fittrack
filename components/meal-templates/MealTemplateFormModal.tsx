"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useHydrated } from "@/hooks/useHydrated";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MEAL_TYPES, labelMealType } from "@/lib/meal-templates";
import { numberToInputValue, parseNumericInput, sanitizeNumericInput } from "@/lib/numeric-input";
import type { MealTemplate, MealTemplateInput, MealType } from "@/types/meal-template";

type MealTemplateFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (input: MealTemplateInput) => Promise<boolean>;
  initial?: MealTemplate | null;
  defaultMealType?: MealType;
};

type MacroFieldKey = "calories" | "protein" | "carbs" | "fat";
type MacroFields = Record<MacroFieldKey, string>;

const emptyMacros: MacroFields = { calories: "", protein: "", carbs: "", fat: "" };

function macrosFromValues(values: Pick<MealTemplateInput, MacroFieldKey>): MacroFields {
  return {
    calories: numberToInputValue(values.calories),
    protein: numberToInputValue(values.protein),
    carbs: numberToInputValue(values.carbs),
    fat: numberToInputValue(values.fat),
  };
}

function macrosToNumbers(fields: MacroFields): Pick<MealTemplateInput, MacroFieldKey> {
  return {
    calories: parseNumericInput(fields.calories),
    protein: parseNumericInput(fields.protein),
    carbs: parseNumericInput(fields.carbs),
    fat: parseNumericInput(fields.fat),
  };
}

export function MealTemplateFormModal({
  open,
  onClose,
  onSave,
  initial,
  defaultMealType = "breakfast",
}: MealTemplateFormModalProps) {
  const mounted = useHydrated();
  const [name, setName] = useState("");
  const [mealType, setMealType] = useState<MealType>("breakfast");
  const [macros, setMacros] = useState<MacroFields>(emptyMacros);
  const [errors, setErrors] = useState<Partial<Record<keyof MealTemplateInput, string>>>({});
  const [saving, setSaving] = useState(false);

  // Reset the form whenever the modal (re)opens or targets a different
  // template (render-time adjustment instead of a cascading effect).
  const [prevForm, setPrevForm] = useState<{
    open: boolean;
    initial: MealTemplate | null | undefined;
    defaultMealType: MealType;
  }>({ open: false, initial: undefined, defaultMealType });
  if (prevForm.open !== open || prevForm.initial !== initial || prevForm.defaultMealType !== defaultMealType) {
    setPrevForm({ open, initial, defaultMealType });
    if (open) {
      if (initial) {
        setName(initial.name);
        setMealType(initial.mealType);
        setMacros(macrosFromValues(initial));
      } else {
        setName("");
        setMealType(defaultMealType);
        setMacros(emptyMacros);
      }
      setErrors({});
    }
  }

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function validate(): boolean {
    const parsed = macrosToNumbers(macros);
    const next: Partial<Record<keyof MealTemplateInput, string>> = {};
    if (!name.trim()) next.name = "Name is required";
    if (!mealType) next.mealType = "Meal type is required";
    if (!macros.calories.trim()) next.calories = "Calories required";
    if (!macros.protein.trim()) next.protein = "Protein required";
    if (!macros.carbs.trim()) next.carbs = "Carbs required";
    if (!macros.fat.trim()) next.fat = "Fat required";
    if (!Number.isFinite(parsed.calories)) next.calories = "Calories required";
    if (!Number.isFinite(parsed.protein)) next.protein = "Protein required";
    if (!Number.isFinite(parsed.carbs)) next.carbs = "Carbs required";
    if (!Number.isFinite(parsed.fat)) next.fat = "Fat required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    const ok = await onSave({
      name: name.trim(),
      mealType,
      ...macrosToNumbers(macros),
    });
    setSaving(false);
    if (ok) onClose();
  }

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center" role="presentation">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={initial ? "Edit template" : "Create template"}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-md max-h-[min(92vh,100dvh)] overflow-y-auto rounded-t-[1.35rem] border border-white/10 bg-[rgba(12,14,22,.98)] p-4 shadow-2xl sm:rounded-2xl"
        style={{ animation: "sheet-up .35s cubic-bezier(.2,.8,.2,1)" }}
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
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            placeholder="e.g. Protein Oats Bowl"
          />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[var(--muted)]">Meal Type</label>
            <select
              value={mealType}
              onChange={(e) => setMealType(e.target.value as MealType)}
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
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={macros[key]}
                onChange={(e) =>
                  setMacros((p) => ({ ...p, [key]: sanitizeNumericInput(e.target.value) }))
                }
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
    </div>,
    document.body,
  );
}
