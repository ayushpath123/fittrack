"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart2,
  Dumbbell,
  LayoutDashboard,
  Medal,
  Trophy,
  Sparkles,
  Utensils,
} from "lucide-react";

const tabs = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/meals", label: "Meals", icon: Utensils },
  { href: "/workout", label: "Lift", icon: Dumbbell },
  { href: "/game", label: "Game", icon: Trophy },
  { href: "/leaderboards", label: "Ranks", icon: Medal },
  { href: "/analytics", label: "Stats", icon: BarChart2 },
  { href: "/coach", label: "Coach", icon: Sparkles },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "linear-gradient(180deg, rgba(10,12,20,.9), rgba(8,10,18,.97))",
        borderTop: "1px solid rgba(255,255,255,.12)",
        backdropFilter: "blur(26px)",
        WebkitBackdropFilter: "blur(26px)",
      }}
    >
      <div className="mx-auto flex h-[var(--app-bottom-nav-h)] w-full overflow-x-auto pb-safe [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 py-2 text-[10px] transition-colors active:scale-95 transition-transform ${
                active ? "text-[#BEFF47]" : "text-[rgba(244,244,255,.46)]"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
              <span className="flex flex-col items-center gap-0.5">
                {label}
                {active ? (
                  <span className="h-1 w-1 rounded-full bg-[#BEFF47]" style={{ boxShadow: "0 0 10px rgba(190,255,71,.55)" }} />
                ) : null}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
