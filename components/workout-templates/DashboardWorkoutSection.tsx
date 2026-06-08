"use client";

import { useState } from "react";
import { Clock, Flame, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { DeleteWorkoutDialog } from "@/components/workout/DeleteWorkoutDialog";
import { WorkoutQuickLog } from "@/components/workout-templates/WorkoutQuickLog";
import { useWorkoutStore } from "@/store/workoutStore";
import type { WorkoutLogType, WorkoutTemplateType } from "@/types/workout";

type DashboardWorkoutSectionProps = {
  templates: WorkoutTemplateType[];
};

export function DashboardWorkoutSection({ templates }: DashboardWorkoutSectionProps) {
  const { todayLogs, removeLog, fetchToday } = useWorkoutStore();
  const [deleteTarget, setDeleteTarget] = useState<WorkoutLogType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const snapshot = deleteTarget;
    const wasToday = todayLogs.some((l) => l.id === snapshot.id);
    if (wasToday) removeLog(snapshot.id);
    setDeleteTarget(null);

    try {
      const res = await fetch(`/api/workout/${snapshot.id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Delete failed");
      void fetchToday();
    } catch {
      if (wasToday) {
        useWorkoutStore.getState().addLog(snapshot);
      }
      toast.error("Could not delete workout.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <section className="space-y-2">
      <p className="px-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
        Workout
      </p>

      <WorkoutQuickLog
        templates={templates}
        manageHref="/workout/templates"
        manageLabel="Templates"
      />

      <div>
        <p className="mb-2 px-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
          Today&apos;s workouts
        </p>
        {todayLogs.length ? (
          <div className="space-y-1.5">
            {todayLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-2.5 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold text-[var(--white)]">{log.workoutName}</p>
                  <div className="mt-0.5 flex gap-2.5 text-[9px] text-[var(--muted)]">
                    <span className="inline-flex items-center gap-0.5">
                      <Flame size={9} className="text-[#BEFF47]" aria-hidden />
                      {log.caloriesBurned} kcal
                    </span>
                    <span className="inline-flex items-center gap-0.5">
                      <Clock size={9} aria-hidden />
                      {log.duration} min
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(log)}
                  aria-label={`Delete ${log.workoutName}`}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-red-950/30 hover:text-red-400"
                >
                  <Trash2 size={13} aria-hidden />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-2.5 py-3 text-center text-[10px] text-[var(--muted)]">
            No workouts logged today.
          </p>
        )}
      </div>

      <DeleteWorkoutDialog
        open={!!deleteTarget}
        isDeleting={isDeleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </section>
  );
}
