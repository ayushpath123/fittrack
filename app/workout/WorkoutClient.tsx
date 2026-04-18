"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, Copy, Plus, Trash2 } from "lucide-react";
import { ExerciseEntryType, WorkoutType } from "@/types";
import { EmptyState } from "@/components/EmptyState";
import { Toast } from "@/components/Toast";
import { StatBanner } from "@/components/StatBanner";

const PRESET_EXERCISES = [
  "Bench Press",
  "Squat",
  "Deadlift",
  "OHP",
  "Pull-up",
  "Barbell Row",
  "Bicep Curl",
  "Tricep Extension",
  "Leg Press",
  "RDL",
  "Face Pull",
  "Lat Pulldown",
];

const exerciseColors: Record<string, string> = {
  push: "#BEFF47",
  legs: "#A78BFA",
  pull: "#2DD4A0",
  arms: "#FFB547",
  other: "#BEFF47",
};

function getExerciseColor(name: string) {
  const n = name.toLowerCase();
  if (n.includes("bench") || n.includes("ohp") || n.includes("push")) return exerciseColors.push;
  if (n.includes("squat") || n.includes("leg") || n.includes("rdl")) return exerciseColors.legs;
  if (n.includes("deadlift") || n.includes("row") || n.includes("pull")) return exerciseColors.pull;
  if (n.includes("curl") || n.includes("tricep")) return exerciseColors.arms;
  return exerciseColors.other;
}

function getExerciseEmoji(name: string) {
  const n = name.toLowerCase();
  if (n.includes("bench") || n.includes("ohp") || n.includes("push")) return "💪";
  if (n.includes("squat") || n.includes("leg")) return "🦵";
  if (n.includes("deadlift") || n.includes("row") || n.includes("pull")) return "🏋️";
  if (n.includes("curl") || n.includes("tricep")) return "🔥";
  return "🏃";
}

export function WorkoutClient({
  todayWorkout,
  recentWorkouts,
  exerciseHints,
}: {
  todayWorkout: WorkoutType | null;
  recentWorkouts: WorkoutType[];
  exerciseHints: Record<string, ExerciseEntryType>;
}) {
  const searchParams = useSearchParams();
  const [workout, setWorkout] = useState(todayWorkout);
  const [started, setStarted] = useState(!!todayWorkout);
  const [draftExercises, setDraftExercises] = useState<ExerciseEntryType[]>(todayWorkout?.exercises ?? []);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<ExerciseEntryType>({ name: "", sets: 3, reps: 10, weight: 0 });
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [undoMessage, setUndoMessage] = useState("");
  const pendingDeleteRef = useRef<{ workout: WorkoutType; draft: ExerciseEntryType[]; timer: ReturnType<typeof setTimeout> } | null>(null);

  useEffect(() => {
    if (searchParams.get("action") === "start") {
      setStarted(true);
    }
  }, [searchParams]);

  useEffect(() => {
    return () => {
      if (pendingDeleteRef.current) clearTimeout(pendingDeleteRef.current.timer);
    };
  }, []);

  function addExercise() {
    if (!form.name.trim()) return;
    setDraftExercises((prev) => [...prev, { ...form, name: form.name.trim() }]);
    setShowModal(false);
    setSearch("");
    setForm({ name: "", sets: 3, reps: 10, weight: 0 });
  }

  function removeExercise(index: number) {
    setDraftExercises((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveWorkout() {
    if (!draftExercises.length) return;
    setIsSaving(true);
    setError("");
    try {
      const date = new Date().toISOString().split("T")[0];
      const res = await fetch("/api/workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ date, exercises: draftExercises }),
      });
      if (!res.ok) throw new Error("Unable to save workout");
      const saved = await res.json();
      setWorkout(saved);
      setStarted(true);
    } catch {
      setError("Could not start workout. Please retry.");
    } finally {
      setIsSaving(false);
    }
  }
  async function markComplete() {
    if (!workout) return;
    setIsSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/workout/${workout.id}`, { method: "PATCH", credentials: "include" });
      if (!res.ok) throw new Error("Unable to mark complete");
      setWorkout({ ...workout, completed: true });
    } catch {
      setError("Could not mark workout done. Please retry.");
    } finally {
      setIsSaving(false);
    }
  }

  function applyWorkoutTemplate(w: WorkoutType) {
    if (workout) {
      setError("You already logged a workout today. Delete it first to load a template.");
      return;
    }
    setError("");
    setDraftExercises(w.exercises.map(({ name, sets, reps, weight }) => ({ name, sets, reps, weight })));
    setStarted(true);
  }

  async function commitDeleteWorkout(snapshot: WorkoutType) {
    const res = await fetch(`/api/workout/${snapshot.id}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) {
      setWorkout(snapshot);
      setDraftExercises(snapshot.exercises);
      setStarted(true);
      setError("Could not delete workout.");
    }
  }

  function undoDeleteWorkout() {
    const pending = pendingDeleteRef.current;
    if (!pending) return;
    clearTimeout(pending.timer);
    setWorkout(pending.workout);
    setDraftExercises(pending.draft);
    setStarted(true);
    pendingDeleteRef.current = null;
    setUndoMessage("");
  }

  function deleteWorkout() {
    if (!workout) return;
    if (pendingDeleteRef.current) {
      const prevPending = pendingDeleteRef.current;
      clearTimeout(prevPending.timer);
      void commitDeleteWorkout(prevPending.workout);
      pendingDeleteRef.current = null;
    }
    const snapshotWorkout = workout;
    const snapshotDraft = draftExercises;
    setWorkout(null);
    setDraftExercises([]);
    setStarted(false);
    setUndoMessage("Workout deleted");
    const timer = setTimeout(() => {
      const pending = pendingDeleteRef.current;
      if (!pending) return;
      void commitDeleteWorkout(pending.workout);
      pendingDeleteRef.current = null;
      setUndoMessage("");
    }, 5000);
    pendingDeleteRef.current = { workout: snapshotWorkout, draft: snapshotDraft, timer };
  }

  return (
    <div className="space-y-4">
      {!started ? (
        <>
          <div>
            <h1 className="num text-2xl font-bold tracking-tight text-[var(--white)]">Lift</h1>
            <p className="text-sm text-[var(--muted)]">Start a session or reuse a recent day</p>
          </div>
          <StatBanner
            label="Training baseline"
            color="green"
            stats={[
              { value: `${recentWorkouts.length}`, sub: "recent sessions" },
              { value: `${Object.keys(exerciseHints).length}`, sub: "exercise hints" },
            ]}
          />
          <button
            onClick={() => setStarted(true)}
            className="w-full rounded-xl bg-[#BEFF47] py-3 text-base font-semibold text-[#06080A] transition-transform hover:bg-[#CCFF5A] active:scale-95"
          >
            Start workout
          </button>
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)]">Recent</h2>
          {recentWorkouts.map((w) => (
            <div key={w.id} className="premium-card mb-3 flex flex-col gap-2 rounded-2xl p-4">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <p className="num text-base font-semibold text-[var(--white)]">{new Date(w.date).toLocaleDateString()}</p>
                  <p className="mt-0.5 text-sm text-[var(--muted)]">{w.exercises.length} exercises</p>
                </div>
                {w.completed && (
                  <span className="inline-flex shrink-0 items-center rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                    Done
                  </span>
                )}
              </div>
              <button
                type="button"
                disabled={!!workout}
                onClick={() => applyWorkoutTemplate(w)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] py-2 text-xs font-semibold text-[var(--muted)] transition-transform hover:border-[#BEFF47]/25 hover:bg-[#BEFF47]/08 hover:text-[#B8E86A] active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Copy size={14} aria-hidden />
                Use as template for today
              </button>
            </div>
          ))}
          {!recentWorkouts.length && <EmptyState title="No workout history" subtitle="Start your first workout to build consistency." />}
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <div>
              <h1 className="num text-2xl font-bold tracking-tight text-[var(--white)]">Today&apos;s workout</h1>
              <p className="text-sm text-[var(--muted)]">Exercises and sets</p>
            </div>
            {workout && !workout.completed && (
              <button
                onClick={markComplete}
                disabled={isSaving}
                className="flex items-center gap-1.5 rounded-full bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-transform hover:bg-green-700 active:scale-95 disabled:bg-green-400"
              >
                <Check size={14} strokeWidth={2.5} /> {isSaving ? "Saving..." : "Done"}
              </button>
            )}
          </div>
          <StatBanner
            label="Today's plan"
            color="blue"
            stats={[
              { value: `${draftExercises.length}`, sub: "exercises" },
              {
                value: `${Math.round(draftExercises.reduce((s, ex) => s + ex.sets, 0))}`,
                sub: "total sets",
              },
            ]}
          />

          {workout?.completed && (
            <div className="flex items-center justify-between rounded-2xl bg-green-100 p-4 dark:bg-emerald-950/35">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-green-700 dark:text-emerald-400">Workout</p>
                <p className="mt-1 text-sm font-semibold text-green-900 dark:text-emerald-100">
                  {draftExercises.length} exercises · Done
                </p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600">
                <Check size={16} className="text-white" strokeWidth={2.5} />
              </div>
            </div>
          )}

          <div className="space-y-3">
            {draftExercises.map((ex, i) => {
              const c = getExerciseColor(ex.name);
              return (
              <div key={`${ex.name}-${i}`} className="premium-card flex items-center justify-between gap-3 rounded-2xl p-4">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl"
                  style={{ background: `${c}1A`, border: `1px solid ${c}30` }}
                >
                  {getExerciseEmoji(ex.name)}
                </div>
                <div className="flex-1">
                  <p className="text-base font-semibold text-[var(--white)]">{ex.name}</p>
                  <div className="mt-1 flex gap-1.5">
                    <span className="rounded-md px-2 py-0.5 text-[11px] font-semibold" style={{ background: `${c}15`, color: c, border: `1px solid ${c}30` }}>
                      {ex.sets} sets
                    </span>
                    <span className="rounded-md px-2 py-0.5 text-[11px] font-semibold" style={{ background: `${c}15`, color: c, border: `1px solid ${c}30` }}>
                      {ex.reps} reps
                    </span>
                  </div>
                </div>
                <div className="mr-2 text-right">
                  <p className="num text-xl font-extrabold" style={{ color: c }}>
                    {ex.weight}
                  </p>
                  <p className="text-[10px] text-[var(--muted)]">kg</p>
                </div>
                {!workout?.completed && (
                  <button
                    type="button"
                    onClick={() => removeExercise(i)}
                    className="text-gray-400 transition-colors hover:text-red-600 dark:hover:text-red-400"
                    aria-label={`Remove ${ex.name}`}
                  >
                    <Trash2 size={16} strokeWidth={1.5} />
                  </button>
                )}
              </div>
            )})}
          </div>

          {!workout?.completed && (
            <button
              onClick={() => setShowModal(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/14 py-3 text-sm text-[var(--hint)] transition-colors hover:border-[#BEFF47]/35 hover:text-[#B8E86A] active:scale-95"
            >
              <Plus size={16} /> Add exercise
            </button>
          )}

          {!workout?.completed && draftExercises.length > 0 && (
            <button
              onClick={saveWorkout}
              disabled={isSaving}
              className="w-full rounded-xl bg-[#BEFF47] py-3 font-semibold text-[#06080A] transition-transform hover:bg-[#CCFF5A] active:scale-95 disabled:opacity-40"
            >
              {isSaving ? "Saving..." : "Save workout"}
            </button>
          )}
          <Toast message={error} type="error" />
          <Toast message={undoMessage} type="info" actionLabel="Undo" onAction={undoDeleteWorkout} />
          {workout && (
            <button
              onClick={deleteWorkout}
              disabled={isSaving}
              className="w-full rounded-xl bg-red-50 py-2.5 text-sm font-medium text-red-800 transition-transform hover:bg-red-100 active:scale-95 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50"
            >
              Delete workout
            </button>
          )}
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/40" onClick={() => setShowModal(false)}>
          <div
            className="mx-auto max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl border-t p-5"
            style={{ borderColor: "rgba(255,255,255,.08)", background: "#1C1C2C", animation: "sheet-up .35s cubic-bezier(.2,.8,.2,1)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-[rgba(255,255,255,.12)]" aria-hidden />
            <h2 className="mb-3 num text-lg font-semibold text-[var(--white)]">Add exercise</h2>
            <input
              placeholder="Search or type exercise..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setForm((f) => ({ ...f, name: e.target.value }));
              }}
              className="mb-2 w-full rounded-xl border border-[rgba(255,255,255,.08)] bg-[rgba(255,255,255,.05)] px-3.5 py-2.5 text-sm text-[var(--white)] transition-all placeholder:text-[var(--muted)] focus:border-[#BEFF47] focus:outline-none"
            />
            {search && (
              <div className="mb-3 max-h-36 overflow-y-auto rounded-xl border border-[rgba(255,255,255,.08)]">
                {PRESET_EXERCISES.filter((e) => e.toLowerCase().includes(search.toLowerCase())).map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => {
                      setForm((f) => ({ ...f, name: e }));
                      setSearch(e);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-[var(--white)] hover:bg-[rgba(255,255,255,.05)]"
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
            {(() => {
              const hint = exerciseHints[form.name.trim()];
              return hint ? (
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      name: hint.name,
                      sets: hint.sets,
                      reps: hint.reps,
                      weight: hint.weight,
                    }))
                  }
                  className="mb-3 w-full rounded-xl border border-[rgba(190,255,71,.35)] bg-[rgba(190,255,71,.12)] px-3 py-2 text-left text-xs text-[#BEFF47]"
                >
                  <span className="font-semibold">Last logged:</span> {hint.sets}×{hint.reps} @ {hint.weight} kg — tap to fill
                </button>
              ) : null;
            })()}
            <div className="mb-4 grid grid-cols-3 gap-2">
              {(["sets", "reps", "weight"] as const).map((field) => (
                <div key={field}>
                  <label className="text-xs font-medium capitalize text-[var(--muted)]">{field}</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    value={form[field]}
                    onChange={(e) => setForm((f) => ({ ...f, [field]: parseFloat(e.target.value) || 0 }))}
                    className="metric-value mt-1 w-full rounded-xl border border-[rgba(255,255,255,.08)] bg-[rgba(255,255,255,.05)] px-2 py-2 text-sm text-[var(--white)] transition-all focus:border-[#BEFF47] focus:outline-none"
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addExercise}
              className="w-full rounded-xl bg-[#BEFF47] py-3 font-semibold text-[#06080A] transition-transform hover:bg-[#CCFF5A] active:scale-95"
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
