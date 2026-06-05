"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-0.5", className)}>
      {eyebrow || action ? (
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            {eyebrow ? (
              <p className="eyebrow flex items-center gap-2 text-[var(--accent)]">
                <span className="inline-block h-3 w-1 rounded-full bg-[var(--accent)]" aria-hidden />
                {eyebrow}
              </p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      <h1 className="num text-[1.6rem] font-bold leading-tight tracking-tight text-[var(--white)]">{title}</h1>
      {subtitle ? <p className="mt-1.5 max-w-[26rem] text-[13px] leading-relaxed text-[var(--muted)]">{subtitle}</p> : null}
    </div>
  );
}
