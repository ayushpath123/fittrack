"use client";

import { ReactNode } from "react";

export function InsightCallout({
  title,
  body,
  icon,
  action,
}: {
  title: string;
  body: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.1] bg-gradient-to-r from-white/[0.05] to-white/[0.02] p-3.5">
      <div className="flex items-start gap-2.5">
        {icon ? (
          <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[rgba(190,255,71,.18)] text-[#B8E86A]">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-[var(--white)]">{title}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-[var(--muted)]">{body}</p>
          {action ? <div className="mt-2">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}
