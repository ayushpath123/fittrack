"use client";

import { Moon, Monitor, Sun } from "lucide-react";
import type { ThemeMode } from "@/components/ThemeProvider";
import { useTheme } from "@/components/ThemeProvider";

const modes: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
];

export function SettingsAppearance() {
  const { theme, setTheme } = useTheme();

  return (
    <div id="appearance" className="premium-card space-y-3 scroll-mt-28 rounded-2xl p-4">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">Appearance</p>
      <p className="text-sm text-gray-500 dark:text-slate-400">Theme is stored on this device only.</p>
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-slate-800" role="group" aria-label="Color theme">
        {modes.map(({ id, label, icon: Icon }) => {
          const active = theme === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTheme(id)}
              className={`flex flex-1 flex-col items-center gap-1 rounded-[10px] py-2.5 text-xs font-medium transition-all ${
                active
                  ? "bg-white font-semibold text-gray-900 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 1.5} />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
