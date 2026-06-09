"use client";

import { useEffect, useState } from "react";
import { BottomSheet } from "@/components/meal-templates/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { sanitizeNumericInput } from "@/lib/numeric-input";
import type { WorkoutTemplateType } from "@/types/workout";

type WorkoutTemplateLogSheetProps = {
  open: boolean;
  template: WorkoutTemplateType | null;
  onClose: () => void;
  onLog: (
    payload: { duration: number; caloriesBurned: number },
    saveDefaults?: boolean,
  ) => Promise<boolean>;
};

export function WorkoutTemplateLogSheet({ open, template, onClose, onLog }: WorkoutTemplateLogSheetProps) {
  const [duration, setDuration] = useState("");
  const [calories, setCalories] = useState("");
  const [saveDefaults, setSaveDefaults] = useState(false);
  const [logging, setLogging] = useState(false);

  const templateId = template?.id;

  useEffect(() => {
    if (!open || !template) return;
    setDuration(String(template.duration));
    setCalories(String(template.caloriesBurned));
    setSaveDefaults(false);
  }, [open, templateId, template]);

  async function handleLog() {
    if (!template) return;
    const d = parseInt(duration, 10);
    const c = parseInt(calories, 10);
    if (!Number.isFinite(d) || d <= 0 || !Number.isFinite(c) || c < 0) return;
    setLogging(true);
    const ok = await onLog({ duration: d, caloriesBurned: c }, saveDefaults);
    setLogging(false);
    if (ok) onClose();
  }

  if (!template) return null;

  const valuesChanged =
    parseInt(duration, 10) !== template.duration || parseInt(calories, 10) !== template.caloriesBurned;

  return (
    <BottomSheet open={open} onClose={onClose} title={template.name}>
      <p className="mb-3 text-[11px] text-[var(--muted)]">
        Adjust for this session{template.exercises.length ? ` · ${template.exercises.length} exercises` : ""}.
      </p>

      <div className="grid grid-cols-2 gap-2">
        <Input
          label="Duration (min)"
          tone="glass"
          type="text"
          inputMode="numeric"
          value={duration}
          onChange={(e) => setDuration(sanitizeNumericInput(e.target.value))}
        />
        <Input
          label="Calories (kcal)"
          tone="glass"
          type="text"
          inputMode="numeric"
          value={calories}
          onChange={(e) => setCalories(sanitizeNumericInput(e.target.value))}
        />
      </div>

      {valuesChanged ? (
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-[11px] text-[var(--muted)]">
          <input
            type="checkbox"
            checked={saveDefaults}
            onChange={(e) => setSaveDefaults(e.target.checked)}
            className="rounded border-white/20"
          />
          Save as template default
        </label>
      ) : null}

      <div className="mt-4">
        <Button className="w-full" onClick={() => void handleLog()} isLoading={logging} loadingText="Saving…">
          Log Workout
        </Button>
      </div>
    </BottomSheet>
  );
}
