"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { SectionHeader } from "@/components/SectionHeader";
import { WorkoutTemplateCard } from "@/components/workout-templates/WorkoutTemplateCard";
import { WorkoutTemplateFormModal } from "@/components/workout-templates/WorkoutTemplateFormModal";
import { WorkoutTemplateLogSheet } from "@/components/workout-templates/WorkoutTemplateLogSheet";
import type { WorkoutTemplateInput, WorkoutTemplateType } from "@/types/workout";

type WorkoutTemplatesClientProps = {
  initialTemplates: WorkoutTemplateType[];
};

type Tab = "strength" | "cardio" | "all";

export function WorkoutTemplatesClient({ initialTemplates }: WorkoutTemplatesClientProps) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [tab, setTab] = useState<Tab>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<WorkoutTemplateType | null>(null);
  const [quickLogTemplate, setQuickLogTemplate] = useState<WorkoutTemplateType | null>(null);

  const filtered = useMemo(() => {
    if (tab === "all") return templates;
    return templates.filter((t) => t.category === tab);
  }, [templates, tab]);

  async function saveTemplate(input: WorkoutTemplateInput): Promise<boolean> {
    try {
      const url = editing ? `/api/workout-templates/${editing.id}` : "/api/workout-templates";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        toast.error("Could not save template.");
        return false;
      }
      const saved = (await res.json()) as WorkoutTemplateType;
      setTemplates((prev) => (editing ? prev.map((t) => (t.id === saved.id ? saved : t)) : [saved, ...prev]));
      toast.success(editing ? "Template updated" : "Template created");
      setEditing(null);
      return true;
    } catch {
      toast.error("Could not save template.");
      return false;
    }
  }

  async function deleteTemplate(template: WorkoutTemplateType) {
    if (template.builtinKey) {
      toast.error("Built-in templates cannot be deleted.");
      return;
    }
    const res = await fetch(`/api/workout-templates/${template.id}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) {
      toast.error("Could not delete template.");
      return;
    }
    setTemplates((prev) => prev.filter((t) => t.id !== template.id));
    toast.success("Template deleted");
  }

  async function quickLog(
    payload: { duration: number; caloriesBurned: number },
    saveDefaults = false,
  ): Promise<boolean> {
    if (!quickLogTemplate) return false;
    try {
      if (saveDefaults) {
        const patchRes = await fetch(`/api/workout-templates/${quickLogTemplate.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: quickLogTemplate.name,
            workoutType: quickLogTemplate.workoutType,
            category: quickLogTemplate.category,
            duration: payload.duration,
            caloriesBurned: payload.caloriesBurned,
            exercises: quickLogTemplate.exercises,
            intensityLevel: quickLogTemplate.intensityLevel ?? "medium",
            cardioType: quickLogTemplate.cardioType ?? undefined,
          }),
        });
        if (!patchRes.ok) {
          toast.error("Could not update template.");
          return false;
        }
        const updated = (await patchRes.json()) as WorkoutTemplateType;
        setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      }

      const res = await fetch(`/api/workout-templates/${quickLogTemplate.id}/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (res.status === 409) {
        toast.error(`${quickLogTemplate.name} already logged today.`);
        return false;
      }
      if (!res.ok) {
        toast.error("Could not log workout.");
        return false;
      }
      toast.success(`${quickLogTemplate.name} logged!`);
      return true;
    } catch {
      toast.error("Could not log workout.");
      return false;
    }
  }

  async function instantLog(template: WorkoutTemplateType) {
    try {
      const res = await fetch(`/api/workout-templates/${template.id}/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      if (res.status === 409) {
        toast.error(`${template.name} already logged today.`);
        return;
      }
      if (!res.ok) {
        toast.error("Could not log workout.");
        return;
      }
      toast.success(`${template.name} logged!`);
    } catch {
      toast.error("Could not log workout.");
    }
  }

  return (
    <div className="space-y-5 pb-4">
      <Link href="/workout" className="inline-flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--white)]">
        <ArrowLeft size={14} aria-hidden />
        Back to Workout
      </Link>

      <SectionHeader
        eyebrow="Templates"
        title="Workout Templates"
        subtitle="Create once, log in one tap."
      />

      <button
        type="button"
        onClick={() => {
          setEditing(null);
          setFormOpen(true);
        }}
        className="btn-accent flex min-h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold"
      >
        <Plus size={16} aria-hidden />
        New Template
      </button>

      <div className="flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1">
        {(["all", "strength", "cardio"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-2 text-[10px] font-semibold capitalize ${
              tab === t ? "bg-[#BEFF47] text-[#06080A]" : "text-[var(--muted)]"
            }`}
          >
            {t === "all" ? "All" : t}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length ? (
          filtered.map((template) => (
            <WorkoutTemplateCard
              key={template.id}
              template={template}
              onQuickLog={() => void instantLog(template)}
              onEdit={() => {
                setEditing(template);
                setFormOpen(true);
              }}
              onDelete={() => void deleteTemplate(template)}
            />
          ))
        ) : (
          <p className="text-center text-sm text-[var(--muted)]">No templates in this category.</p>
        )}
      </div>

      <WorkoutTemplateFormModal
        open={formOpen}
        initial={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSave={saveTemplate}
      />

      <WorkoutTemplateLogSheet
        open={!!quickLogTemplate}
        template={quickLogTemplate}
        onClose={() => setQuickLogTemplate(null)}
        onLog={(payload, saveDefaults) => quickLog(payload, saveDefaults)}
      />
    </div>
  );
}
