"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Dumbbell, LayoutDashboard, Scale, Utensils } from "lucide-react";
import { VoiceMicNavButton } from "@/components/voice/VoiceMicNavButton";

type NavTab = { href: string; label: string; icon: LucideIcon };

const leftTabs: NavTab[] = [
  { href: "/dashboard", label: "Today", icon: LayoutDashboard },
  { href: "/meals", label: "Calories", icon: Utensils },
];

const rightTabs: NavTab[] = [
  { href: "/workout", label: "Workout", icon: Dumbbell },
  { href: "/weight", label: "Weight", icon: Scale },
];

function NavTabLink({ href, label, icon: Icon }: NavTab) {
  const path = usePathname();
  const active = path.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`group relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1.5 py-2 text-[10px] font-medium transition-all duration-200 active:scale-95 ${
        active ? "text-[#BEFF47]" : "text-[rgba(244,244,255,.46)] hover:text-[rgba(244,244,255,.72)]"
      }`}
    >
      <span
        className="flex h-8 w-12 items-center justify-center rounded-full transition-all duration-200"
        style={
          active
            ? {
                background: "var(--accent-soft)",
                boxShadow: "inset 0 0 0 1px var(--accent-border)",
              }
            : undefined
        }
      >
        <Icon size={20} strokeWidth={active ? 2.5 : 1.75} />
      </span>
      <span className="leading-none">{label}</span>
    </Link>
  );
}

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--glass-border)] pb-safe"
      style={{
        background: "linear-gradient(180deg, rgba(10,12,20,.88), rgba(7,9,15,.98))",
        backdropFilter: "blur(28px) saturate(1.4)",
        WebkitBackdropFilter: "blur(28px) saturate(1.4)",
      }}
    >
      <div className="relative mx-auto grid h-[var(--app-bottom-nav-h)] w-full max-w-md grid-cols-5 items-center px-2">
        {leftTabs.map((tab) => (
          <NavTabLink key={tab.href} {...tab} />
        ))}

        <div className="flex items-center justify-center">
          <VoiceMicNavButton />
        </div>

        {rightTabs.map((tab) => (
          <NavTabLink key={tab.href} {...tab} />
        ))}
      </div>
    </nav>
  );
}
