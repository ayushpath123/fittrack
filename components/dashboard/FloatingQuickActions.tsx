"use client";

import Link from "next/link";
import { useState } from "react";
import { Droplets, Dumbbell, Plus, Scale, Utensils, X } from "lucide-react";
import { cn } from "@/lib/utils";

const actions = [
  { href: "/workout?action=start", label: "Log Workout", icon: Dumbbell, color: "text-[#FFB547]" },
  { href: "/meals", label: "Add Meal", icon: Utensils, color: "text-[#BEFF47]" },
  { href: "/weight", label: "Log Weight", icon: Scale, color: "text-[#A78BFA]" },
  { href: "/dashboard#hydration", label: "Add Water", icon: Droplets, color: "text-[#57B4FF]" },
] as const;

export function FloatingQuickActions() {
  const [open, setOpen] = useState(false);

  return (
    <div className="pointer-events-none fixed bottom-[calc(var(--app-bottom-nav-h)+0.75rem)] right-3.5 z-[55] flex flex-col items-end gap-2">
      {open ? (
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          {actions.map((action, i) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-full border border-white/[0.1] bg-[rgba(13,15,24,.92)] py-2 pl-3 pr-4 shadow-lg backdrop-blur-xl transition-transform active:scale-95"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <span className={`flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] ${action.color}`}>
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
          "pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full border border-[rgba(190,255,71,.35)] shadow-[var(--shadow-accent)] transition-transform active:scale-95",
          open ? "bg-white/[0.08] text-[var(--white)]" : "bg-[var(--accent-grad)] text-[var(--accent-on)]",
        )}
      >
        {open ? <X size={22} strokeWidth={2.5} aria-hidden /> : <Plus size={24} strokeWidth={2.5} aria-hidden />}
      </button>
    </div>
  );
}
