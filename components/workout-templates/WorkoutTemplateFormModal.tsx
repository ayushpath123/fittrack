"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { WorkoutTypeSelect } from "@/components/workout/WorkoutTypeSelect";
import { sanitizeNumericInput, parseIntegerInput } from "@/lib/numeric-input";
import {
  CARDIO_TYPES,
  INTENSITY_LEVELS,
  type TemplateExercise,
  type WorkoutTemplateInput,
  type WorkoutTemplateType,
  type WorkoutTypeKind,
} from "@/types/workout";

type WorkoutTemplateFormModalProps = {
  open: boolean;
  initial?: WorkoutTemplateType | null;
  onClose: () => void;
  onSave: (input: WorkoutTemplateInput) => Promise<boolean>;
};

function emptyExercise(): TemplateExercise {
  return { exerciseName: "", sets: 3, reps: "8-12", weight: null, rest: 90 };
}

export function WorkoutTemplateFormModal({ open, initial, onClose, onSave }: WorkoutTemplateFormModalProps) {
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [workoutType, setWorkoutType] = useState<WorkoutTypeKind | "">("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("45");
  const [calories, setCalories] = useState("400");
  const [intensity, setIntensity] = useState<"low" | "medium" | "high">("medium");
  const [category, setCategory] = useState<"strength" | "cardio">("strength");
  const [cardioType, setCardioType] = useState("");
  const [exercises, setExercises] = useState<TemplateExercise[]>([emptyExercise()]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setName(initial.name);
      setWorkoutType(initial.workoutType);
      setDescription(initial.description ?? "");
      setDuration(String(initial.duration));
      setCalories(String(initial.caloriesBurned));
      setIntensity(initial.intensityLevel ?? "medium");
      setCategory(initial.category);
      setCardioType(initial.cardioType ?? "");
      setExercises(initial.exercises.length ? initial.exercises : [emptyExercise()]);
    } else {
      setName("");
      setWorkoutType("");
      setDescription("");
      setDuration("45");
      setCalories("400");
      setIntensity("medium");
      setCategory("strength");
      setCardioType("");
      setExercises([emptyExercise()]);
    }
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  async function handleSave() {
    if (!name.trim() || !workoutType) return;
    const d = parseInt(duration, 10);
    const c = parseInt(calories, 10);
    if (!Number.isFinite(d) || d <= 0 || !Number.isFinite(c)) return;

    setSaving(true);
    const input: WorkoutTemplateInput = {
      name: name.trim(),
      workoutType,
      description: description.trim() || undefined,
      intensityLevel: intensity,
      category,
      duration: d,
      caloriesBurned: c,
      exercises: category === "strength" ? exercises.filter((e) => e.exerciseName.trim()) : [],
      ...(category === "cardio" && cardioType
        ? { cardioType: cardioType as WorkoutTemplateInput["cardioType"] }
        : {}),
    };
    const ok = await onSave(input);
    setSaving(false);
    if (ok) onClose();
  }

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center" role="presentation">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 max-h-[min(92vh,100dvh)] w-full max-w-md overflow-y-auto rounded-t-3xl border-t p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]"
        style={{ borderColor: "rgba(255,255,255,.08)", background: "#1C1C2C" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--white)]">
            {initial ? "Edit Template" : "New Template"}
          </h2>
          <button type="button" onClick={onClose} className="text-[var(--muted)]">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <Input label="Template Name" tone="glass" value={name} onChange={(e) => setName(e.target.value)} />
          <WorkoutTypeSelect value={workoutType} onChange={setWorkoutType} />

          <div className="flex gap-2">
            {(["strength", "cardio"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold capitalize ${
                  category === c ? "bg-[#BEFF47] text-[#06080A]" : "bg-white/[0.04] text-[var(--muted)]"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

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
              label="Calories"
              tone="glass"
              type="text"
              inputMode="numeric"
              value={calories}
              onChange={(e) => setCalories(sanitizeNumericInput(e.target.value))}
            />
          </div>

          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">Intensity</p>
            <div className="flex gap-1">
              {INTENSITY_LEVELS.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => setIntensity(l.value)}
                  className={`flex-1 rounded-lg py-2 text-[10px] font-semibold ${
                    intensity === l.value ? "bg-white/10 text-[var(--white)]" : "text-[var(--muted)]"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {category === "cardio" ? (
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">Cardio Type</p>
              <div className="flex flex-wrap gap-1">
                {CARDIO_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setCardioType(t.value)}
                    className={`rounded-lg px-2 py-1.5 text-[10px] font-medium ${
                      cardioType === t.value ? "bg-[#38BDF8]/20 text-[#38BDF8]" : "bg-white/[0.04] text-[var(--muted)]"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">Exercises</p>
              <div className="space-y-2">
                {exercises.map((ex, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      tone="glass"
                      placeholder="Exercise name"
                      value={ex.exerciseName}
                      onChange={(e) => {
                        const next = [...exercises];
                        next[i] = { ...ex, exerciseName: e.target.value };
                        setExercises(next);
                      }}
                      className="flex-1"
                    />
                    <Input
                      tone="glass"
                      type="text"
                      inputMode="numeric"
                      placeholder="Sets"
                      value={String(ex.sets)}
                      onChange={(e) => {
                        const next = [...exercises];
                        const sets = Math.max(1, parseIntegerInput(sanitizeNumericInput(e.target.value)) || 1);
                        next[i] = { ...ex, sets };
                        setExercises(next);
                      }}
                      className="w-16"
                    />
                    <button
                      type="button"
                      onClick={() => setExercises(exercises.filter((_, j) => j !== i))}
                      className="text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setExercises([...exercises, emptyExercise()])}
                  className="inline-flex items-center gap-1 text-xs text-[#B8E86A]"
                >
                  <Plus size={12} /> Add exercise
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={() => void handleSave()} isLoading={saving}>
              Save Template
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
