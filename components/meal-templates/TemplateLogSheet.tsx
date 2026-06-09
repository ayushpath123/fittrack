"use client";

import { useEffect, useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { BottomSheet } from "@/components/meal-templates/BottomSheet";
import { MacroDisplay } from "@/components/meal-templates/MacroDisplay";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { scaleMacros } from "@/lib/meal-templates";
import { numberToInputValue, parseNumericInput, sanitizeNumericInput } from "@/lib/numeric-input";
import type { MacroSnapshot } from "@/lib/meal-templates";
import type { MealTemplate, MealType } from "@/types/meal-template";

const SERVING_PRESETS = [0.5, 1, 1.5, 2, 3] as const;

type TemplateLogSheetProps = {
  open: boolean;
  template: MealTemplate | null;
  mealType: MealType;
  onClose: () => void;
  onLog: (payload: { servings: number; macros: MacroSnapshot; mealType: MealType }) => Promise<boolean>;
};

export function TemplateLogSheet({ open, template, mealType, onClose, onLog }: TemplateLogSheetProps) {
  const [servings, setServings] = useState(1);
  const [editing, setEditing] = useState(false);
  const [customMacros, setCustomMacros] = useState<MacroSnapshot | null>(null);
  const [macroFields, setMacroFields] = useState<Record<keyof MacroSnapshot, string>>({
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
  });
  const [logging, setLogging] = useState(false);

  const baseMacros = useMemo(
    () =>
      template
        ? {
            calories: template.calories,
            protein: template.protein,
            carbs: template.carbs,
            fat: template.fat,
          }
        : { calories: 0, protein: 0, carbs: 0, fat: 0 },
    [template],
  );

  const scaledMacros = useMemo(() => scaleMacros(baseMacros, servings), [baseMacros, servings]);

  const displayMacros = editing && customMacros ? customMacros : scaledMacros;

  useEffect(() => {
    if (!open) return;
    setServings(1);
    setEditing(false);
    setCustomMacros(null);
  }, [open, template?.id]);

  useEffect(() => {
    if (editing) {
      setCustomMacros(scaledMacros);
      setMacroFields({
        calories: numberToInputValue(scaledMacros.calories),
        protein: numberToInputValue(scaledMacros.protein),
        carbs: numberToInputValue(scaledMacros.carbs),
        fat: numberToInputValue(scaledMacros.fat),
      });
    }
  }, [editing, scaledMacros]);

  function adjustServings(delta: number) {
    setServings((prev) => {
      const next = Math.round((prev + delta) * 2) / 2;
      return Math.max(0.5, Math.min(3, next));
    });
    setEditing(false);
    setCustomMacros(null);
  }

  async function handleLog() {
    if (!template) return;
    setLogging(true);
    const macrosFromFields = editing
      ? {
          calories: parseNumericInput(macroFields.calories),
          protein: parseNumericInput(macroFields.protein),
          carbs: parseNumericInput(macroFields.carbs),
          fat: parseNumericInput(macroFields.fat),
        }
      : displayMacros;
    const ok = await onLog({
      servings: editing ? 1 : servings,
      macros: macrosFromFields,
      mealType,
    });
    setLogging(false);
    if (ok) onClose();
  }

  if (!template) return null;

  return (
    <BottomSheet open={open} onClose={onClose} title={template.name}>
      <MacroDisplay macros={displayMacros} />

      {!editing ? (
        <div className="mt-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">Servings</p>
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => adjustServings(-0.5)}
              disabled={servings <= 0.5}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[var(--white)] disabled:opacity-40"
            >
              <Minus size={16} />
            </button>
            <div className="flex flex-1 gap-1">
              {SERVING_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setServings(preset);
                    setEditing(false);
                    setCustomMacros(null);
                  }}
                  className={`flex-1 rounded-lg py-2 text-[11px] font-semibold ${
                    servings === preset ? "bg-[#BEFF47] text-[#06080A]" : "bg-white/[0.04] text-[var(--muted)]"
                  }`}
                >
                  {preset}x
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => adjustServings(0.5)}
              disabled={servings >= 3}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[var(--white)] disabled:opacity-40"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2">
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
              value={macroFields[key]}
              onChange={(e) => {
                const value = sanitizeNumericInput(e.target.value);
                setMacroFields((prev) => ({ ...prev, [key]: value }));
                setCustomMacros((prev) => ({
                  ...(prev ?? scaledMacros),
                  [key]: parseNumericInput(value),
                }));
              }}
            />
          ))}
        </div>
      )}

      <div className="mt-5 space-y-2">
        <Button className="w-full" onClick={() => void handleLog()} isLoading={logging} loadingText="Logging…">
          Log Meal
        </Button>
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => setEditing((v) => !v)}
          disabled={logging}
        >
          {editing ? "Back to Servings" : "Edit Before Logging"}
        </Button>
      </div>
    </BottomSheet>
  );
}
