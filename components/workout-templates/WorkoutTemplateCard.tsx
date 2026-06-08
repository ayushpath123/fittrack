"use client";

import { Clock, Flame, Pencil, Trash2, Zap } from "lucide-react";
import type { WorkoutTemplateType } from "@/types/workout";
import { cn } from "@/lib/utils";

type WorkoutTemplateCardProps = {
  template: WorkoutTemplateType;
  onEdit?: () => void;
  onDelete?: () => void;
  onQuickLog?: () => void;
  className?: string;
};

export function WorkoutTemplateCard({
  template,
  onEdit,
  onDelete,
  onQuickLog,
  className,
}: WorkoutTemplateCardProps) {
  return (
    <div className={cn("premium-card flex items-center gap-3 rounded-xl p-3", className)}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[var(--white)]">
          {template.icon ? `${template.icon} ` : ""}
          {template.name}
        </p>
        <div className="mt-0.5 flex gap-3 text-[10px] text-[var(--muted)]">
          <span className="inline-flex items-center gap-1">
            <Flame size={10} aria-hidden />
            {template.caloriesBurned} kcal
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock size={10} aria-hidden />
            {template.duration} min
          </span>
          {template.exercises.length > 0 ? <span>{template.exercises.length} ex</span> : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {onQuickLog ? (
          <button
            type="button"
            onClick={onQuickLog}
            className="inline-flex items-center gap-1 rounded-lg bg-[rgba(190,255,71,.14)] px-2.5 py-1.5 text-[10px] font-semibold text-[#B8E86A]"
          >
            <Zap size={11} aria-hidden />
            Log
          </button>
        ) : null}
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Edit ${template.name}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-[var(--muted)] hover:text-[var(--white)]"
          >
            <Pencil size={13} aria-hidden />
          </button>
        ) : null}
        {onDelete && !template.builtinKey ? (
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete ${template.name}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/20 text-red-400"
          >
            <Trash2 size={13} aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  );
}
