"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, X } from "lucide-react";

const KEY = "fittrack-welcome-dismissed";

export function WelcomeTips() {
  // Must match SSR: never read localStorage in useState — that diverges after dismiss and breaks hydration.
  const [show, setShow] = useState(true);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === "1") setShow(false);
    } catch {
      /* ignore */
    }
  }, []);

  if (!show) return null;

  function dismiss() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  return (
    <div className="flex items-start gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3 pr-2 backdrop-blur-sm">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#BEFF47] text-[#06080A]">
        <Sparkles size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold text-[var(--white)]">Welcome to FitTrack</p>
        <p className="mt-0.5 text-xs leading-snug text-[var(--muted)]">
          Log meals from <strong className="text-[var(--white)]">Meals</strong>, review{" "}
          <Link href="/weekly" className="font-medium text-[#B8E86A] underline hover:text-[#BEFF47]">
            This week
          </Link>
          , and export backups in{" "}
          <Link href="/settings" className="font-medium text-[#B8E86A] underline hover:text-[#BEFF47]">
            Settings
          </Link>
          .
        </p>
      </div>
      <button
        type="button"
        aria-label="Dismiss welcome tip"
        onClick={dismiss}
        className="shrink-0 rounded-xl p-1.5 text-[var(--hint)] transition-colors hover:bg-white/[0.08] hover:text-[var(--white)]"
      >
        <X size={16} />
      </button>
    </div>
  );
}
