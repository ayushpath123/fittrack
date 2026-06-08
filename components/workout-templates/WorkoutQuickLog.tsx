"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import { TemplateScrollRow } from "@/components/workout-templates/TemplateScrollRow";
import { WorkoutQuickLogCard } from "@/components/workout-templates/WorkoutQuickLogCard";
import { useWorkoutStore } from "@/store/workoutStore";
import type { WorkoutTemplateType } from "@/types/workout";

type WorkoutQuickLogProps = {
  templates: WorkoutTemplateType[];
  showManageLink?: boolean;
  manageHref?: string;
  manageLabel?: string;
};

export function WorkoutQuickLog({
  templates,
  showManageLink = true,
  manageHref = "/workout/templates",
  manageLabel = "Templates",
}: WorkoutQuickLogProps) {
  const { addLog, fetchToday, todayLogs } = useWorkoutStore();
  const [loggingIds, setLoggingIds] = useState<Set<string>>(() => new Set());

  const loggedTodayTemplateIds = useMemo(
    () => new Set(todayLogs.map((l) => l.templateId).filter(Boolean) as string[]),
    [todayLogs],
  );

  const strength = useMemo(() => templates.filter((t) => t.category === "strength"), [templates]);
  const cardio = useMemo(() => templates.filter((t) => t.category === "cardio"), [templates]);

  async function tapLog(template: WorkoutTemplateType) {
    if (loggingIds.has(template.id)) return;
    if (loggedTodayTemplateIds.has(template.id)) {
      toast.error(`${template.name} already logged today.`);
      return;
    }

    setLoggingIds((prev) => new Set(prev).add(template.id));
    try {
      const res = await fetch(`/api/workout-templates/${template.id}/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });

      if (res.status === 409) {
        toast.error(`${template.name} already logged today.`);
        void fetchToday();
        return;
      }
      if (!res.ok) {
        toast.error("Could not log workout.");
        return;
      }

      const saved = (await res.json()) as Parameters<typeof addLog>[0];
      addLog(saved);
      void fetchToday();
      toast.success(`${template.name} logged`);
    } catch {
      toast.error("Could not log workout.");
    } finally {
      setLoggingIds((prev) => {
        const next = new Set(prev);
        next.delete(template.id);
        return next;
      });
    }
  }

  if (!strength.length && !cardio.length) return null;

  return (
    <section>
      <div className="mb-2 flex items-center justify-between px-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Quick log</p>
        {showManageLink ? (
          <Link
            href={manageHref}
            className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#B8E86A]"
          >
            {manageLabel}
            <ChevronRight size={12} aria-hidden />
          </Link>
        ) : null}
      </div>

      <div className="premium-card rounded-[var(--radius-card)] p-2.5 !shadow-none hover:!shadow-none">
        {strength.length > 0 ? (
          <TemplateScrollRow itemCount={strength.length} label="Strength">
            {strength.map((template) => (
              <WorkoutQuickLogCard
                key={template.id}
                template={template}
                busy={loggingIds.has(template.id)}
                logged={loggedTodayTemplateIds.has(template.id)}
                onLog={() => void tapLog(template)}
              />
            ))}
          </TemplateScrollRow>
        ) : null}

        {cardio.length > 0 ? (
          <TemplateScrollRow
            itemCount={cardio.length}
            label="Cardio"
            className={strength.length > 0 ? "mt-2 border-t border-white/[0.06] pt-2" : undefined}
          >
            {cardio.map((template) => (
              <WorkoutQuickLogCard
                key={template.id}
                template={template}
                busy={loggingIds.has(template.id)}
                logged={loggedTodayTemplateIds.has(template.id)}
                onLog={() => void tapLog(template)}
              />
            ))}
          </TemplateScrollRow>
        ) : null}
      </div>
    </section>
  );
}
