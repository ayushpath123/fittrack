"use client";

import { Clock, Flame, Pencil, Trash2 } from "lucide-react";
import { workoutTypeLabel, type WorkoutLogType } from "@/types/workout";

type WorkoutLogCardProps = {
  log: WorkoutLogType;
  onEdit?: () => void;
  onDelete?: () => void;
  showDate?: boolean;
};

export function WorkoutLogCard({ log, onEdit, onDelete, showDate = false }: WorkoutLogCardProps) {
  const time = new Date(log.createdAt).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" });
  const date = new Date(log.workoutDate).toLocaleDateString("en", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <div className="premium-card rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-[var(--white)]">{log.workoutName}</p>
          <span className="mt-1.5 inline-flex rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]">
            {workoutTypeLabel(log.workoutType)}
          </span>
        </div>
        <div className="flex shrink-0 gap-1">
          {onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-white/[0.06] hover:text-[#B8E86A]"
              aria-label="Edit workout"
            >
              <Pencil size={14} />
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-red-950/30 hover:text-red-400"
              aria-label="Delete workout"
            >
              <Trash2 size={14} />
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
        <span className="inline-flex items-center gap-1">
          <Clock size={13} aria-hidden />
          {log.duration} min
        </span>
        <span className="inline-flex items-center gap-1 text-[#FFB547]">
          <Flame size={13} aria-hidden />
          {log.caloriesBurned} kcal
        </span>
        {showDate ? <span className="text-[11px]">{date}</span> : <span className="text-[11px]">{time}</span>}
      </div>

      {log.notes ? <p className="mt-2 text-xs text-[var(--hint)]">{log.notes}</p> : null}
    </div>
  );
}
