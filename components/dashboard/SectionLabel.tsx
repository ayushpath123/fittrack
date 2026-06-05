import type { ReactNode } from "react";

export function SectionLabel({ children, action }: { children: string; action?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{children}</p>
      {action}
    </div>
  );
}
