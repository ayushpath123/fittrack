"use client";

import Link from "next/link";
import {
  Activity,
  BarChart3,
  BookOpen,
  Calendar,
  Camera,
  ChevronRight,
  Dumbbell,
  Download,
  EllipsisVertical,
  FileText,
  LogOut,
  Medal,
  Target,
  Trophy,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppBrand } from "@/components/AppBrand";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { logout } from "@/lib/auth-client";
import toast from "react-hot-toast";

type MenuItem = {
  href: string;
  label: string;
  hint: string;
  icon: LucideIcon;
};

const menuSections: { title: string; items: MenuItem[] }[] = [
  {
    title: "Settings",
    items: [
      { href: "/settings", label: "Goals & profile", hint: "Targets, theme, subscription", icon: Target },
      { href: "/settings#your-data", label: "Export & backup", hint: "JSON or CSV downloads", icon: Download },
    ],
  },
  {
    title: "Templates & tools",
    items: [
      { href: "/meals/templates", label: "Meal templates", hint: "Save meals for fast logging", icon: BookOpen },
      { href: "/workout/templates", label: "Workout templates", hint: "Quick-log strength & cardio", icon: Dumbbell },
      { href: "/meals/ai", label: "AI meal scan", hint: "Photo calorie estimate", icon: Camera },
    ],
  },
  {
    title: "Explore",
    items: [
      { href: "/activity", label: "Activity hub", hint: "Feed, streaks, shortcuts", icon: Activity },
      { href: "/analytics", label: "Stats & trends", hint: "Charts and adherence", icon: BarChart3 },
      { href: "/calendar", label: "Calendar", hint: "Day-by-day history", icon: Calendar },
      { href: "/weekly", label: "Weekly review", hint: "AI week summary", icon: FileText },
      { href: "/game", label: "Arena", hint: "Quests and XP", icon: Trophy },
      { href: "/leaderboards", label: "Leaderboards", hint: "Monthly XP ranks", icon: Medal },
    ],
  },
];

export function Sidebars() {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();

  const closeAll = () => {
    setProfileOpen(false);
  };

  const handleSignOut = () => {
    closeAll();
    void logout().catch(() => {
      toast.error("Could not sign out. Try again.");
    });
  };

  useEffect(() => {
    if (!profileOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = profileMenuRef.current;
      if (el && !el.contains(e.target as Node)) setProfileOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setProfileOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [profileOpen]);

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-40"
        style={{
          background: "linear-gradient(180deg, rgba(9,11,18,.86), rgba(8,10,17,.72))",
          borderBottom: "1px solid var(--glass-border)",
          backdropFilter: "blur(28px) saturate(1.4)",
          WebkitBackdropFilter: "blur(28px) saturate(1.4)",
        }}
      >
        <div className="max-w-md mx-auto px-3.5 py-2.5 h-[var(--app-header-h)] flex items-center justify-between">
          <div className="min-w-0">
            <AppBrand href="/dashboard" />
          </div>
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            <Link
              href="/meals/ai"
              aria-label="AI meal scan"
              className="flex h-9 w-9 items-center justify-center rounded-xl border transition-transform duration-150 active:scale-90"
              style={{ borderColor: "var(--accent-border)", background: "var(--accent-soft)" }}
            >
              <Camera size={16} className="text-[#BEFF47]" />
            </Link>
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                aria-label="Open app menu"
                aria-expanded={profileOpen}
                aria-haspopup="dialog"
                onClick={() => setProfileOpen((o) => !o)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-transform duration-150 active:scale-90"
                style={{ borderColor: "var(--glass-border)", background: "var(--glass)" }}
              >
                <EllipsisVertical size={16} className="text-[var(--white)]" />
              </button>

              {profileOpen && (
                <div
                  role="dialog"
                  aria-label="App menu"
                  className="absolute top-full right-0 mt-1.5 z-50 w-[min(calc(100vw-1.5rem),18.5rem)] overflow-hidden rounded-2xl border"
                  style={{ borderColor: "rgba(255,255,255,.10)", background: "rgba(14,15,22,.98)" }}
                >
                  <div className="border-b px-3 py-2.5" style={{ borderColor: "rgba(255,255,255,.08)", background: "rgba(255,255,255,.04)" }}>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)]">Menu</p>
                    <p className="text-xs font-semibold text-[var(--white)] truncate" title={session?.user?.email ?? ""}>
                      {session?.user?.email ?? "Guest"}
                    </p>
                  </div>
                  <div className="max-h-[58vh] overflow-y-auto py-1.5 px-2">
                    {menuSections.map((section) => (
                      <div key={section.title} className="mb-1 last:mb-0">
                        <p className="px-2 pb-1 pt-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--hint)]">
                          {section.title}
                        </p>
                        <ul>
                          {section.items.map(({ href, label, hint, icon: Icon }) => (
                            <li key={`${href}-${label}`}>
                              <Link
                                href={href}
                                onClick={() => setProfileOpen(false)}
                                className="flex items-start gap-2.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/[0.05]"
                                style={{ color: "var(--white)" }}
                              >
                                <Icon size={16} className="mt-0.5 shrink-0 text-[#BEFF47]" aria-hidden />
                                <span className="min-w-0 flex-1">
                                  <span className="flex items-center gap-0.5 text-xs font-semibold text-[var(--white)]">
                                    {label}
                                    <ChevronRight size={12} className="shrink-0 text-gray-400" aria-hidden />
                                  </span>
                                  <span className="block text-[10px] text-[var(--muted)] leading-tight">{hint}</span>
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <div className="border-t p-2" style={{ borderColor: "rgba(255,255,255,.08)", background: "rgba(255,255,255,.04)" }}>
                    {session?.user ? (
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-[rgba(255,92,122,.22)] bg-[rgba(255,92,122,.1)] px-3 py-2 text-xs font-semibold text-[#ff7d95] transition-colors hover:bg-[rgba(255,92,122,.16)] active:scale-[0.98]"
                      >
                        <LogOut size={14} aria-hidden />
                        Log out
                      </button>
                    ) : (
                      <Link
                        href="/login"
                        onClick={() => setProfileOpen(false)}
                        className="block w-full rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-center text-xs font-semibold text-[#B8E86A] transition-colors hover:bg-white/[0.07]"
                      >
                        Sign in
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
