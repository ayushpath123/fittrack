"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { WorkoutTypeSelect } from "@/components/workout/WorkoutTypeSelect";
import type { WorkoutLogType, WorkoutTemplateType, WorkoutTypeKind } from "@/types/workout";

export type WorkoutFormValues = {
  workoutName: string;
  workoutType: WorkoutTypeKind | "";
  duration: string;
  caloriesBurned: string;
  notes: string;
};

type WorkoutLogFormProps = {
  initial?: Partial<WorkoutFormValues>;
  templates?: WorkoutTemplateType[];
  isSaving?: boolean;
  submitLabel?: string;
  onSubmit: (values: WorkoutFormValues, templateId?: string) => void;
  onCancel: () => void;
};

function emptyForm(): WorkoutFormValues {
  return { workoutName: "", workoutType: "", duration: "", caloriesBurned: "", notes: "" };
}

export function WorkoutLogForm({
  initial,
  templates = [],
  isSaving,
  submitLabel = "Save Workout",
  onSubmit,
  onCancel,
}: WorkoutLogFormProps) {
  const [form, setForm] = useState<WorkoutFormValues>({ ...emptyForm(), ...initial });
  const [errors, setErrors] = useState<Partial<Record<keyof WorkoutFormValues, string>>>({});
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>();

  function applyTemplate(t: WorkoutTemplateType) {
    setForm({
      workoutName: t.name,
      workoutType: t.workoutType,
      duration: String(t.duration),
      caloriesBurned: String(t.caloriesBurned),
      notes: "",
    });
    setSelectedTemplateId(t.id);
    setErrors({});
  }

  function validate(): boolean {
    const next: Partial<Record<keyof WorkoutFormValues, string>> = {};
    if (!form.workoutName.trim()) next.workoutName = "Workout name is required";
    if (!form.workoutType) next.workoutType = "Workout type is required";
    const duration = parseInt(form.duration, 10);
    if (!Number.isFinite(duration) || duration <= 0) next.duration = "Enter a valid duration in minutes";
    const calories = parseInt(form.caloriesBurned, 10);
    if (!Number.isFinite(calories) || calories < 0) next.caloriesBurned = "Enter a valid calorie amount";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSubmit(form, selectedTemplateId);
  }

  return (
    <div className="space-y-4">
      {templates.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Quick templates</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => applyTemplate(t)}
                className="shrink-0 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-left transition-colors hover:border-[#BEFF47]/30 hover:bg-[#BEFF47]/08"
              >
                <p className="text-xs font-semibold text-[var(--white)]">{t.name}</p>
                <p className="mt-0.5 text-[10px] text-[var(--muted)]">
                  {t.duration} min · {t.caloriesBurned} kcal
                </p>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <Input
        label="Workout Name"
        tone="glass"
        placeholder="e.g. Chest Workout, Morning Run"
        value={form.workoutName}
        onChange={(e) => setForm((f) => ({ ...f, workoutName: e.target.value }))}
        error={errors.workoutName}
      />

      <WorkoutTypeSelect
        value={form.workoutType}
        onChange={(v) => setForm((f) => ({ ...f, workoutType: v }))}
        error={errors.workoutType}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Duration (min)"
          tone="glass"
          type="number"
          inputMode="numeric"
          min={1}
          placeholder="45"
          value={form.duration}
          onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
          error={errors.duration}
        />
        <Input
          label="Calories Burned"
          tone="glass"
          type="number"
          inputMode="numeric"
          min={0}
          placeholder="300"
          value={form.caloriesBurned}
          onChange={(e) => setForm((f) => ({ ...f, caloriesBurned: e.target.value }))}
          error={errors.caloriesBurned}
        />
      </div>

      <Input
        label="Notes (optional)"
        tone="glass"
        placeholder="Heavy chest day, morning run..."
        value={form.notes}
        onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
      />

      <div className="flex gap-2 pt-1">
        <Button variant="secondary" className="flex-1" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button className="flex-1" onClick={handleSubmit} isLoading={isSaving} loadingText="Saving...">
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}

export function logToFormValues(log: WorkoutLogType): WorkoutFormValues {
  return {
    workoutName: log.workoutName,
    workoutType: log.workoutType,
    duration: String(log.duration),
    caloriesBurned: String(log.caloriesBurned),
    notes: log.notes ?? "",
  };
}
