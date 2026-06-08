"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import toast from "react-hot-toast";
import { DeleteTemplateConfirmModal } from "@/components/meal-templates/DeleteTemplateConfirmModal";
import { MealTemplateCard } from "@/components/meal-templates/MealTemplateCard";
import { MealTemplateFormModal } from "@/components/meal-templates/MealTemplateFormModal";
import { MealTypeTabs } from "@/components/meal-templates/MealTypeTabs";
import { TemplateLogSheet } from "@/components/meal-templates/TemplateLogSheet";
import { SectionHeader } from "@/components/SectionHeader";
import { Button } from "@/components/ui/Button";
import {
  detectMealTypeFromTime,
  filterTemplatesByMealType,
  searchTemplates,
} from "@/lib/meal-templates";
import type { MacroSnapshot } from "@/lib/meal-templates";
import type { MealTemplate, MealTemplateInput, MealType } from "@/types/meal-template";

type MealTemplatesClientProps = {
  initialTemplates: MealTemplate[];
};

export function MealTemplatesClient({ initialTemplates }: MealTemplatesClientProps) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [activeTab, setActiveTab] = useState<MealType>(detectMealTypeFromTime());
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MealTemplate | null>(null);
  const [deleting, setDeleting] = useState<MealTemplate | null>(null);
  const [quickLogTemplate, setQuickLogTemplate] = useState<MealTemplate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filtered = useMemo(() => {
    const byTab = filterTemplatesByMealType(templates, activeTab);
    return searchTemplates(byTab, search);
  }, [templates, activeTab, search]);

  async function saveTemplate(input: MealTemplateInput): Promise<boolean> {
    try {
      const url = editing ? `/api/meal-templates/${editing.id}` : "/api/meal-templates";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? "Could not save template.");
        return false;
      }
      const saved = (await res.json()) as MealTemplate;
      setTemplates((prev) => {
        if (editing) return prev.map((t) => (t.id === saved.id ? saved : t));
        return [saved, ...prev];
      });
      toast.success(editing ? "Template updated successfully" : "Template created successfully");
      setEditing(null);
      return true;
    } catch {
      toast.error("Could not save template.");
      return false;
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/meal-templates/${deleting.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        toast.error("Could not delete template.");
        return;
      }
      setTemplates((prev) => prev.filter((t) => t.id !== deleting.id));
      toast.success("Template deleted");
      setDeleting(null);
    } finally {
      setIsDeleting(false);
    }
  }

  async function quickLog(payload: { servings: number; macros: MacroSnapshot; mealType: MealType }) {
    if (!quickLogTemplate) return false;
    try {
      const res = await fetch(`/api/meal-templates/${quickLogTemplate.id}/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          date: new Date().toISOString().split("T")[0],
          mealType: payload.mealType,
          servings: payload.servings,
          macros: payload.macros,
        }),
      });
      if (!res.ok) {
        toast.error("Could not log meal.");
        return false;
      }
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === quickLogTemplate.id
            ? { ...t, useCount: t.useCount + 1, lastUsedAt: new Date().toISOString() }
            : t,
        ),
      );
      toast.success("Meal logged successfully");
      return true;
    } catch {
      toast.error("Could not log meal.");
      return false;
    }
  }

  return (
    <div className="space-y-4 pb-24">
      <SectionHeader
        eyebrow="Nutrition"
        title="Meal Templates"
        subtitle="Save frequently eaten meals for faster logging."
        action={
          <Link
            href="/meals"
            className="text-[11px] font-semibold text-[#B8E86A]"
          >
            Back
          </Link>
        }
      />

      <Button
        className="w-full"
        icon={<Plus size={16} />}
        onClick={() => {
          setEditing(null);
          setFormOpen(true);
        }}
      >
        Create Template
      </Button>

      <MealTypeTabs value={activeTab} onChange={setActiveTab} />

      <div className="relative">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--hint)]" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search templates…"
          className="w-full rounded-xl border border-white/12 bg-white/[0.05] py-2.5 pl-9 pr-3 text-sm text-[var(--white)] placeholder:text-[var(--hint)] focus:border-[#BEFF47]/35 focus:outline-none"
        />
      </div>

      {templates.length === 0 ? (
        <div className="premium-card rounded-2xl p-6 text-center">
          <p className="text-sm font-semibold text-[var(--white)]">No templates yet</p>
          <p className="mt-1 text-xs text-[var(--muted)]">Create your first meal template to log meals faster.</p>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="mt-3 inline-flex rounded-xl border border-[rgba(190,255,71,.35)] bg-[rgba(190,255,71,.12)] px-3 py-1.5 text-xs font-semibold text-[#B8E86A]"
          >
            Create Template
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-xs text-[var(--muted)]">No templates match your search.</p>
      ) : (
        <div className="grid min-w-0 gap-2 sm:grid-cols-2">
          {filtered.map((template) => (
            <MealTemplateCard
              key={template.id}
              template={template}
              onEdit={() => {
                setEditing(template);
                setFormOpen(true);
              }}
              onDelete={() => setDeleting(template)}
              onQuickLog={() => setQuickLogTemplate(template)}
            />
          ))}
        </div>
      )}

      <MealTemplateFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSave={saveTemplate}
        initial={editing}
        defaultMealType={activeTab}
      />

      <DeleteTemplateConfirmModal
        open={Boolean(deleting)}
        templateName={deleting?.name}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
        isDeleting={isDeleting}
      />

      <TemplateLogSheet
        open={Boolean(quickLogTemplate)}
        template={quickLogTemplate}
        mealType={quickLogTemplate?.mealType ?? activeTab}
        onClose={() => setQuickLogTemplate(null)}
        onLog={quickLog}
      />
    </div>
  );
}
