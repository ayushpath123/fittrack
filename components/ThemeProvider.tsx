"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "fittrack-theme";

function getSystemDark() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyDomTheme(mode: ThemeMode) {
  const root = document.documentElement;
  const dark = mode === "dark" || (mode === "system" && getSystemDark());
  root.classList.toggle("dark", dark);
}

export function readStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === "light" || v === "dark" || v === "system") return v;
  return "system";
}

export function writeStoredTheme(mode: ThemeMode) {
  localStorage.setItem(STORAGE_KEY, mode);
  applyDomTheme(mode);
  window.dispatchEvent(new Event("fittrack-theme"));
}

const ThemeContext = createContext<{
  theme: ThemeMode;
  setTheme: (m: ThemeMode) => void;
} | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme outside ThemeProvider");
  return ctx;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => readStoredTheme());

  useEffect(() => {
    applyDomTheme(theme);
  }, [theme]);

  useEffect(() => {
    const onStorage = () => setThemeState(readStoredTheme());
    const onTheme = () => applyDomTheme(readStoredTheme());
    window.addEventListener("storage", onStorage);
    window.addEventListener("fittrack-theme", onTheme);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onMq = () => {
      if (readStoredTheme() === "system") applyDomTheme("system");
    };
    mq.addEventListener("change", onMq);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("fittrack-theme", onTheme);
      mq.removeEventListener("change", onMq);
    };
  }, []);

  const setTheme = useCallback((m: ThemeMode) => {
    writeStoredTheme(m);
    setThemeState(m);
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
