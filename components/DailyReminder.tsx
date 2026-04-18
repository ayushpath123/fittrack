"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";

type GoalsPrefs = { reminderEnabled: boolean; reminderTime: string };

export function DailyReminder() {
  const { status } = useSession();
  const prefsRef = useRef<GoalsPrefs | null>(null);
  const lastFireKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") {
      prefsRef.current = null;
      return;
    }
    let cancelled = false;
    let controller: AbortController | null = null;
    const loadPrefs = async () => {
      controller?.abort();
      controller = new AbortController();
      try {
        const res = await fetch("/api/settings/goals", {
          credentials: "include",
          signal: controller.signal,
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const d = await res.json();
        if (cancelled) return;
        prefsRef.current = {
          reminderEnabled: !!d.reminderEnabled,
          reminderTime:
            typeof d.reminderTime === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(d.reminderTime) ? d.reminderTime : "09:00",
        };
      } catch (err) {
        if ((err as Error).name === "AbortError" || cancelled) return;
      }
    };
    void loadPrefs();
    // Keep reminder settings reasonably fresh without noisy background polling.
    const id = window.setInterval(loadPrefs, 10 * 60_000);
    return () => {
      cancelled = true;
      controller?.abort();
      window.clearInterval(id);
    };
  }, [status]);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    const id = window.setInterval(() => {
      const prefs = prefsRef.current;
      if (!prefs?.reminderEnabled || Notification.permission !== "granted") return;

      const now = new Date();
      const [h, m] = prefs.reminderTime.split(":").map(Number);
      if (now.getHours() !== h || now.getMinutes() !== m) return;

      const key = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${h}-${m}`;
      if (lastFireKeyRef.current === key) return;
      lastFireKeyRef.current = key;

      new Notification("FitTrack", {
        body: "Log meals, weight, or a quick workout to stay on track.",
      });
    }, 30_000);

    return () => window.clearInterval(id);
  }, [status]);

  return null;
}
