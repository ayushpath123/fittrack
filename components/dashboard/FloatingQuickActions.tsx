"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Dumbbell, Plus, Scale, Utensils, X } from "lucide-react";
import { cn } from "@/lib/utils";

const linkActions = [
  { href: "/meals?action=add", label: "Log Meal", icon: Utensils, color: "text-[#BEFF47]", ring: "rgba(190,255,71,.35)" },
  { href: "/weight?action=log", label: "Log Weight", icon: Scale, color: "text-[#A78BFA]", ring: "rgba(167,139,250,.35)" },
  { href: "/workout?action=log", label: "Log Workout", icon: Dumbbell, color: "text-[#FFB547]", ring: "rgba(255,181,71,.35)" },
] as const;

const glassActionClass =
  "pointer-events-auto flex items-center gap-2 rounded-full border border-white/[0.12] bg-[rgba(13,15,24,.55)] py-2 pl-3 pr-4 shadow-[inset_0_1px_0_rgba(255,255,255,.08),0_8px_24px_-8px_rgba(0,0,0,.55)] backdrop-blur-xl backdrop-saturate-150 transition-transform active:scale-95";

/** Align FAB with max-w-md content column on wider viewports */
const fabPositionStyle = {
  bottom: "calc(var(--app-bottom-nav-h) + 0.75rem)",
  right: "max(0.875rem, calc((100vw - min(100vw, 28rem)) / 2 + 0.875rem))",
} as const;

export function FloatingQuickActions() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fab = (
    <div
      className="pointer-events-none fixed z-[60] flex flex-col items-end gap-2"
      style={fabPositionStyle}
    >
      {open ? (
        <div className="flex flex-col items-end gap-2">
          {linkActions.map((action, i) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                onClick={() => setOpen(false)}
                className={glassActionClass}
                style={{
                  animationDelay: `${i * 40}ms`,
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,.08), 0 0 0 1px ${action.ring}, 0 8px 24px -8px rgba(0,0,0,.55)`,
                }}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.06] ${action.color}`}
                >
                  <Icon size={16} aria-hidden />
                </span>
                <span className="text-xs font-semibold text-[var(--white)]">{action.label}</span>
              </Link>
            );
          })}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close quick actions" : "Open quick actions"}
        aria-expanded={open}
        className={cn(
          "pointer-events-auto relative flex h-14 w-14 items-center justify-center rounded-full border backdrop-blur-xl backdrop-saturate-150 transition-all active:scale-95",
          open
            ? "border-white/[0.18] bg-[rgba(255,255,255,.08)] text-[var(--white)] shadow-[inset_0_1px_0_rgba(255,255,255,.12),0_0_0_1px_rgba(255,255,255,.08),0_8px_28px_-10px_rgba(0,0,0,.6)]"
            : "border-[rgba(190,255,71,.45)] bg-[rgba(13,15,24,.45)] text-[#BEFF47] shadow-[inset_0_1px_0_rgba(255,255,255,.1),0_0_0_1px_rgba(190,255,71,.25),0_0_28px_rgba(190,255,71,.22),0_8px_32px_-12px_rgba(0,0,0,.65)]",
        )}
      >
        {!open ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-[rgba(190,255,71,.35)] ring-offset-0"
          />
        ) : null}
        {open ? <X size={22} strokeWidth={2.5} aria-hidden /> : <Plus size={24} strokeWidth={2.5} aria-hidden />}
      </button>
    </div>
  );

  if (!mounted) return null;

  return createPortal(fab, document.body);
}
