"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { SectionHeader } from "@/components/SectionHeader";
import { Toast } from "@/components/Toast";
import { DeleteWorkoutDialog } from "@/components/workout/DeleteWorkoutDialog";
import { WorkoutAnalytics } from "@/components/workout/WorkoutAnalytics";
import { WorkoutLogCard } from "@/components/workout/WorkoutLogCard";
import { WorkoutLogForm, type WorkoutFormValues } from "@/components/workout/WorkoutLogForm";
import { useWorkoutStore } from "@/store/workoutStore";
import type { WorkoutDaySummary, WorkoutLogType, WorkoutTemplateType } from "@/types/workout";

type ModalMode = "create" | "edit" | null;

export function WorkoutClient({
  todayLogs: initialTodayLogs,
  historyLogs: initialHistory,
  templates: initialTemplates,
  todaySummary: initialTodaySummary,
  weekSummary: initialWeekSummary,
}: {
  todayLogs: WorkoutLogType[];
  historyLogs: WorkoutLogType[];
  templates: WorkoutTemplateType[];
  todaySummary: WorkoutDaySummary;
  weekSummary: WorkoutDaySummary;
}) {
  const searchParams = useSearchParams();
  const { initFromServer, addLog, updateLog, removeLog, todayLogs, todaySummary, weekSummary } = useWorkoutStore();

  const [history, setHistory] = useState(initialHistory);
  const [templates] = useState(initialTemplates);
  const [modal, setModal] = useState<ModalMode>(null);
  const [editingLog, setEditingLog] = useState<WorkoutLogType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkoutLogType | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    initFromServer(initialTodayLogs, initialTodaySummary, initialWeekSummary);
  }, [initialTodayLogs, initialTodaySummary, initialWeekSummary, initFromServer]);

  useEffect(() => {
    if (searchParams.get("action") === "log") {
      setModal("create");
    }
  }, [searchParams]);

  function openCreate() {
    setEditingLog(null);
    setModal("create");
    setError("");
  }

  function openEdit(log: WorkoutLogType) {
    setEditingLog(log);
    setModal("edit");
    setError("");
  }

  function closeModal() {
    setModal(null);
    setEditingLog(null);
  }

  async function saveWorkout(values: WorkoutFormValues, templateId?: string) {
    setIsSaving(true);
    setError("");
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
        const isToday = todayLogs.some((l) => l.id === saved.id);
        if (isToday) updateLog(saved);
        setHistory((prev) => prev.map((l) => (l.id === saved.id ? saved : l)));
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
        setHistory((prev) => [saved, ...prev.filter((l) => l.id !== saved.id)]);
      }
      closeModal();
      void useWorkoutStore.getState().fetchToday();
    } catch {
      setError(modal === "edit" ? "Could not update workout. Please retry." : "Could not save workout. Please retry.");
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setError("");
    const snapshot = deleteTarget;
    const wasToday = todayLogs.some((l) => l.id === snapshot.id);
    if (wasToday) removeLog(snapshot.id);
    setHistory((prev) => prev.filter((l) => l.id !== snapshot.id));
    setDeleteTarget(null);

    try {
      const res = await fetch(`/api/workout/${snapshot.id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Delete failed");
      void useWorkoutStore.getState().fetchToday();
    } catch {
      if (wasToday) addLog(snapshot);
      setHistory((prev) => [snapshot, ...prev]);
      setError("Could not delete workout. Please retry.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-5 pb-4">
      <SectionHeader
        eyebrow="Activity"
        title="Workout Tracker"
        subtitle="Track your activity and calories burned."
      />

      <button
        type="button"
        onClick={openCreate}
        className="btn-accent flex min-h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold"
      >
        <Plus size={16} aria-hidden />
        Log Workout
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
            subtitle="Start tracking your activity."
            actionLabel="Log Workout"
            onAction={openCreate}
          />
        )}
      </div>

      <div>
        <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
          Workout History
        </h2>
        {history.length ? (
          <div className="space-y-3">
            {history.map((log) => (
              <WorkoutLogCard
                key={log.id}
                log={log}
                showDate
                onEdit={() => openEdit(log)}
                onDelete={() => setDeleteTarget(log)}
              />
            ))}
          </div>
        ) : (
          <EmptyState title="No workout history" subtitle="Your logged workouts will appear here." />
        )}
      </div>

      {modal ? (
        <div className="fixed inset-0 z-40 flex items-end bg-black/40" onClick={closeModal}>
          <div
            className="mx-auto max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl border-t p-5"
            style={{
              borderColor: "rgba(255,255,255,.08)",
              background: "#1C1C2C",
              animation: "sheet-up .35s cubic-bezier(.2,.8,.2,1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-[rgba(255,255,255,.12)]" aria-hidden />
            <h2 className="mb-4 text-lg font-semibold text-[var(--white)]">
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
        </div>
      ) : null}

      <DeleteWorkoutDialog
        open={!!deleteTarget}
        isDeleting={isDeleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />

      <Toast message={error} type="error" />
    </div>
  );
}
