"use client";

import { ReactNode } from "react";

export function PrimaryActionBar({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[rgba(190,255,71,.3)] bg-gradient-to-r from-[rgba(190,255,71,.14)] via-[rgba(190,255,71,.08)] to-[rgba(87,180,255,.08)] p-3.5 shadow-[0_12px_30px_rgba(0,0,0,.24)]">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-[#E4FFC0]">{title}</p>
          <p className="mt-0.5 text-[11px] text-[#D1F09A]/95">{subtitle}</p>
        </div>
        <div className="shrink-0">{action}</div>
      </div>
    </div>
  );
}
