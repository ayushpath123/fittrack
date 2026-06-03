"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem("fittrack-pwa-dismissed") === "1") {
      setDismissed(true);
      return;
    }
    const isIos =
      /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !(window.navigator as Navigator & { standalone?: boolean }).standalone;
    if (isIos && window.localStorage.getItem("fittrack-first-log-done") === "1") {
      setIosHint(true);
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (dismissed) return null;
  if (!deferred && !iosHint) return null;

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    setDeferred(null);
    window.localStorage.setItem("fittrack-pwa-dismissed", "1");
    setDismissed(true);
  }

  function dismiss() {
    window.localStorage.setItem("fittrack-pwa-dismissed", "1");
    setDismissed(true);
    setIosHint(false);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex gap-2">
          <Download size={16} className="mt-0.5 shrink-0 text-[#BEFF47]" />
          <div>
            <p className="text-xs font-semibold text-[var(--white)]">Add to home screen</p>
            <p className="mt-0.5 text-[10px] text-[var(--muted)]">
              {iosHint
                ? "Tap Share → Add to Home Screen for quick daily logging."
                : "Install FitTrack for one-tap access like an app."}
            </p>
          </div>
        </div>
        <button type="button" onClick={dismiss} aria-label="Dismiss" className="text-[var(--muted)]">
          <X size={14} />
        </button>
      </div>
      {deferred ? (
        <button
          type="button"
          onClick={() => void install()}
          className="mt-2 w-full rounded-lg bg-[#BEFF47] py-2 text-[11px] font-semibold text-[#06080A]"
        >
          Install
        </button>
      ) : null}
    </div>
  );
}
