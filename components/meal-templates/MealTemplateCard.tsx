"use client";

import { Pencil, Trash2, Zap } from "lucide-react";
import { MacroDisplay } from "@/components/meal-templates/MacroDisplay";
import type { MealTemplate } from "@/types/meal-template";
import { cn } from "@/lib/utils";

type MealTemplateCardProps = {
  template: MealTemplate;
  onEdit?: () => void;
  onDelete?: () => void;
  onQuickLog?: () => void;
  onSelect?: () => void;
  compact?: boolean;
  className?: string;
};

export function MealTemplateCard({
  template,
  onEdit,
  onDelete,
  onQuickLog,
  onSelect,
  compact = false,
  className,
}: MealTemplateCardProps) {
  const interactive = Boolean(onSelect);

  return (
    <div
      className={cn(
        "premium-card min-w-0 rounded-xl text-left transition-transform",
        interactive && "active:scale-[0.98]",
        compact ? "p-3" : "p-3.5",
        className,
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        disabled={!onSelect}
        className={cn("w-full text-left", !onSelect && "cursor-default")}
      >
        <p className="text-sm font-semibold text-[var(--white)]">{template.name}</p>
        <div className="mt-2">
          <MacroDisplay
            macros={{
              calories: template.calories,
              protein: template.protein,
              carbs: template.carbs,
              fat: template.fat,
            }}
            size={compact ? "sm" : "md"}
          />
        </div>
      </button>

      {(onEdit || onDelete || onQuickLog) && (
        <div
          className={cn(
            "mt-3 gap-1.5 border-t border-white/[0.08] pt-2.5",
            onQuickLog ? "grid grid-cols-[minmax(0,1fr)_auto_auto]" : "flex justify-end",
          )}
        >
          {onQuickLog ? (
            <button
              type="button"
              onClick={onQuickLog}
              className="inline-flex min-w-0 items-center justify-center gap-1 rounded-lg bg-[rgba(190,255,71,.14)] px-2 py-2 text-[10px] font-semibold text-[#B8E86A]"
            >
              <Zap size={12} className="shrink-0" aria-hidden />
              <span className="truncate">Quick Log</span>
            </button>
          ) : null}
          {onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              aria-label={`Edit ${template.name}`}
              title="Edit"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 text-[var(--muted)] hover:text-[var(--white)]"
            >
              <Pencil size={13} aria-hidden />
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              aria-label={`Delete ${template.name}`}
              title="Delete"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10"
            >
              <Trash2 size={13} aria-hidden />
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
