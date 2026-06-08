"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toLocalDateKey } from "@/lib/date";
import { createPortal } from "react-dom";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import { EmptyState } from "@/components/EmptyState";
import { SectionHeader } from "@/components/SectionHeader";
import { DeleteWorkoutDialog } from "@/components/workout/DeleteWorkoutDialog";
import { WorkoutLogCard } from "@/components/workout/WorkoutLogCard";
import { WorkoutLogForm, type WorkoutFormValues } from "@/components/workout/WorkoutLogForm";
import { WorkoutAnalytics } from "@/components/workout/WorkoutAnalytics";
import { WorkoutCaloriesChart } from "@/components/workout-templates/WorkoutCaloriesChart";
import { WorkoutQuickLog } from "@/components/workout-templates/WorkoutQuickLog";
import type { WorkoutCaloriesPoint } from "@/lib/workout-chart-data";
import { useWorkoutStore } from "@/store/workoutStore";
import type { WorkoutDaySummary, WorkoutLogType, WorkoutTemplateType } from "@/types/workout";

type ModalMode = "create" | "edit" | null;

export function WorkoutClient({
  todayLogs: initialTodayLogs,
  templates: initialTemplates,
  todaySummary: initialTodaySummary,
  weekSummary: initialWeekSummary,
  caloriesSeries,
}: {
  todayLogs: WorkoutLogType[];
  templates: WorkoutTemplateType[];
  todaySummary: WorkoutDaySummary;
  weekSummary: WorkoutDaySummary;
  caloriesSeries: WorkoutCaloriesPoint[];
}) {
  const searchParams = useSearchParams();
  const { initFromServer, addLog, updateLog, removeLog, todayLogs, todaySummary, weekSummary } = useWorkoutStore();

  const [templates] = useState(initialTemplates);
  const [modal, setModal] = useState<ModalMode>(null);
  const [editingLog, setEditingLog] = useState<WorkoutLogType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkoutLogType | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mounted, setMounted] = useState(false);

  const chartData = useMemo(() => {
    const todayKey = toLocalDateKey(new Date());
    const todayTotal = todayLogs.reduce((s, l) => s + l.caloriesBurned, 0);
    return caloriesSeries.map((p) =>
      p.dateKey === todayKey ? { ...p, calories: todayTotal } : p,
    );
  }, [caloriesSeries, todayLogs]);

  useEffect(() => {
    initFromServer(initialTodayLogs, initialTodaySummary, initialWeekSummary);
  }, [initialTodayLogs, initialTodaySummary, initialWeekSummary, initFromServer]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "log" || action === "start") {
      setModal("create");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!modal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [modal]);

  function openCreate() {
    setEditingLog(null);
    setModal("create");
  }

  function openEdit(log: WorkoutLogType) {
    setEditingLog(log);
    setModal("edit");
  }

  function closeModal() {
    setModal(null);
    setEditingLog(null);
  }

  async function saveWorkout(values: WorkoutFormValues, templateId?: string) {
    setIsSaving(true);
    const payload = {
      workoutName: values.workoutName.trim(),
      workoutType: values.workoutType,
      duration: parseInt(values.duration, 10),
      caloriesBurned: parseInt(values.caloriesBurned, 10),
      notes: values.notes.trim() || undefined,
      ...(templateId ? { templateId } : {}),
    };

    try {
      if (modal === "edit" && editingLog) {
        const res = await fetch(`/api/workout/${editingLog.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Unable to update workout");
        const saved = (await res.json()) as WorkoutLogType;
        if (todayLogs.some((l) => l.id === saved.id)) updateLog(saved);
      } else {
        const tempId = `temp-${Date.now()}`;
        const optimistic: WorkoutLogType = {
          id: tempId,
          userId: "",
          workoutName: payload.workoutName,
          workoutType: payload.workoutType as WorkoutLogType["workoutType"],
          duration: payload.duration,
          caloriesBurned: payload.caloriesBurned,
          workoutDate: new Date().toISOString(),
          notes: payload.notes,
          createdAt: new Date().toISOString(),
        };
        addLog(optimistic);

        const res = await fetch("/api/workout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          removeLog(tempId);
          throw new Error("Unable to save workout");
        }
        const saved = (await res.json()) as WorkoutLogType;
        removeLog(tempId);
        addLog(saved);
      }
      closeModal();
      void useWorkoutStore.getState().fetchToday();
    } catch {
      toast.error(modal === "edit" ? "Could not update workout. Please retry." : "Could not save workout. Please retry.");
    } finally {
      setIsSaving(false);
    }
  }

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
      void useWorkoutStore.getState().fetchToday();
    } catch {
      if (wasToday) addLog(snapshot);
      toast.error("Could not delete workout. Please retry.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-5 pb-4">
      <SectionHeader
        eyebrow="Activity"
        title="Workout Tracker"
        subtitle="Tap a template to log instantly."
      />

      <WorkoutQuickLog templates={templates} manageLabel="Edit templates" />

      <WorkoutCaloriesChart data={chartData} />

      <button
        type="button"
        onClick={openCreate}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] text-sm font-medium text-[var(--muted)]"
      >
        <Plus size={16} aria-hidden />
        Manual Log
      </button>

      <WorkoutAnalytics today={todaySummary} week={weekSummary} />

      <div>
        <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
          Today&apos;s Workouts
        </h2>
        {todayLogs.length ? (
          <div className="space-y-3">
            {todayLogs.map((log) => (
              <WorkoutLogCard
                key={log.id}
                log={log}
                onEdit={() => openEdit(log)}
                onDelete={() => setDeleteTarget(log)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No workouts recorded today"
            subtitle="Tap a template above to log instantly."
            actionLabel="Manual Log"
            onAction={openCreate}
          />
        )}
      </div>

      {mounted && modal
        ? createPortal(
            <div className="fixed inset-0 z-[70] flex items-end justify-center" role="presentation">
              <button
                type="button"
                aria-label="Close"
                className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
                onClick={closeModal}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="workout-log-title"
                className="relative z-10 mx-auto max-h-[min(92vh,100dvh)] w-full max-w-md overflow-y-auto rounded-t-3xl border-t p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]"
                style={{
                  borderColor: "rgba(255,255,255,.08)",
                  background: "#1C1C2C",
                  animation: "sheet-up .35s cubic-bezier(.2,.8,.2,1)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-[rgba(255,255,255,.12)]" aria-hidden />
                <h2 id="workout-log-title" className="mb-4 text-lg font-semibold text-[var(--white)]">
                  {modal === "edit" ? "Edit Workout" : "Log Workout"}
                </h2>
                <WorkoutLogForm
                  templates={modal === "create" ? templates : []}
                  isSaving={isSaving}
                  submitLabel={modal === "edit" ? "Save Changes" : "Save Workout"}
                  initial={
                    editingLog
                      ? {
                          workoutName: editingLog.workoutName,
                          workoutType: editingLog.workoutType,
                          duration: String(editingLog.duration),
                          caloriesBurned: String(editingLog.caloriesBurned),
                          notes: editingLog.notes ?? "",
                        }
                      : undefined
                  }
                  onSubmit={(values, templateId) => void saveWorkout(values, templateId)}
                  onCancel={closeModal}
                />
              </div>
            </div>,
            document.body,
          )
        : null}

      <DeleteWorkoutDialog
        open={!!deleteTarget}
        isDeleting={isDeleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
