"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";

export function PushReminderOptIn() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
    if (window.localStorage.getItem("fittrack-push-banner-dismissed") === "1") {
      setDismissed(true);
    }
  }, []);

  if (permission === "unsupported" || permission === "granted" || dismissed) return null;

  async function enable() {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      try {
        const getRes = await fetch("/api/settings/goals", { credentials: "include", cache: "no-store" });
        if (getRes.ok) {
          const goals = (await getRes.json()) as {
            calorieTarget: number;
            proteinTarget: number;
            carbTarget?: number;
            fatTarget?: number;
            waterTargetMl?: number;
          };
          await fetch("/api/settings/goals", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              calorieTarget: goals.calorieTarget,
              proteinTarget: goals.proteinTarget,
              carbTarget: goals.carbTarget,
              fatTarget: goals.fatTarget,
              waterTargetMl: goals.waterTargetMl,
              reminderEnabled: true,
              reminderTime: "09:00",
            }),
          });
        }
      } catch {
        /* ignore — user can enable in Settings */
      }
      setDismissed(true);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-3">
      <div className="flex gap-2">
        <Bell size={16} className="shrink-0 text-[#B8E86A]" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-[var(--white)]">Daily log reminder</p>
          <p className="mt-0.5 text-[10px] text-[var(--muted)]">Get a nudge to log meals at your chosen time.</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => void enable()}
              className="rounded-lg bg-[#BEFF47] px-3 py-1.5 text-[10px] font-semibold text-[#06080A]"
            >
              Enable
            </button>
            <button
              type="button"
              onClick={() => {
                window.localStorage.setItem("fittrack-push-banner-dismissed", "1");
                setDismissed(true);
              }}
              className="rounded-lg border border-white/12 px-3 py-1.5 text-[10px] text-[var(--muted)]"
            >
              Not now
            </button>
          </div>
          <Link href="/settings" className="mt-1.5 inline-block text-[10px] text-[#B8E86A]">
            Set time in Settings
          </Link>
        </div>
      </div>
    </div>
  );
}
