"use client";

import { Clock, Flame, Zap } from "lucide-react";
import { templateTheme, type WorkoutTemplateType } from "@/types/workout";
import { cn } from "@/lib/utils";

type WorkoutTemplateQuickLogCardProps = {
  template: WorkoutTemplateType;
  onQuickLog: () => void;
  onEdit?: () => void;
  compact?: boolean;
  className?: string;
};

export function WorkoutTemplateQuickLogCard({
  template,
  onQuickLog,
  onEdit,
  compact = false,
  className,
}: WorkoutTemplateQuickLogCardProps) {
  const theme = templateTheme(template.workoutType);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border transition-transform active:scale-[0.98]",
        compact ? "p-3" : "p-4",
        className,
      )}
      style={{
        borderColor: `${theme.color}33`,
        background: `linear-gradient(135deg, ${theme.bg}, rgba(12,14,22,.6))`,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {template.icon ? <span className="text-lg leading-none">{template.icon}</span> : null}
            <p className="truncate text-sm font-semibold text-[var(--white)]">{template.name}</p>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-[var(--muted)]">
            <span className="inline-flex items-center gap-1">
              <Flame size={12} style={{ color: theme.color }} aria-hidden />
              {template.caloriesBurned} kcal
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock size={12} aria-hidden />
              {template.duration} min
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onQuickLog}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition-opacity hover:opacity-90"
          style={{ background: theme.color, color: "#06080A" }}
        >
          <Zap size={14} aria-hidden />
          Quick Log
        </button>
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="rounded-xl border border-white/10 px-3 py-2.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--white)]"
          >
            Edit
          </button>
        ) : null}
      </div>
    </div>
  );
}
