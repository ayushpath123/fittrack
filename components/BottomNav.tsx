"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Dumbbell,
  LayoutDashboard,
  MoreHorizontal,
  Scale,
  Utensils,
} from "lucide-react";

const tabs = [
  { href: "/dashboard", label: "Today", icon: LayoutDashboard },
  { href: "/meals", label: "Calories", icon: Utensils },
  { href: "/workout", label: "Workout", icon: Dumbbell },
  { href: "/weight", label: "Weight", icon: Scale },
  { href: "/activity", label: "More", icon: MoreHorizontal },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "linear-gradient(180deg, rgba(10,12,20,.82), rgba(7,9,15,.97))",
        borderTop: "1px solid var(--glass-border)",
        backdropFilter: "blur(28px) saturate(1.4)",
        WebkitBackdropFilter: "blur(28px) saturate(1.4)",
      }}
    >
      <div className="mx-auto flex h-[var(--app-bottom-nav-h)] w-full max-w-md items-center gap-1 px-2 pb-safe">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/activity"
              ? ["/activity", "/analytics", "/calendar", "/game", "/leaderboards", "/coach", "/settings"].some((p) =>
                  path.startsWith(p),
                )
              : path.startsWith(href);
          return (
            <Link
              key={href}
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
        })}
      </div>
    </nav>
  );
}
