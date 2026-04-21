"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Download, Smartphone } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isIosSafari() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const isIos = /iPhone|iPad|iPod/i.test(ua);
  const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
  return isIos && isSafari;
}

function InstallAppPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = useMemo(() => searchParams.get("next") || "/dashboard", [searchParams]);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setIsIos(isIosSafari());
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    if (!deferredPrompt) return;
    void triggerInstall();
    // Trigger once per page load when the event is available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredPrompt]);

  async function triggerInstall() {
    if (!deferredPrompt) return;
    setIsInstalling(true);
    setMessage("");
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setMessage("App install started.");
      } else {
        setMessage("Install dismissed. You can continue and install later.");
      }
      setDeferredPrompt(null);
    } finally {
      setIsInstalling(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="premium-card space-y-4 rounded-2xl p-5">
        <div className="inline-flex items-center gap-1 rounded-full border border-[rgba(190,255,71,.35)] bg-[rgba(190,255,71,.15)] px-2 py-1 text-[10px] font-semibold text-[#B8E86A]">
          <Smartphone size={12} />
          Install FitTrack app
        </div>

        <h1 className="text-xl font-bold text-[var(--white)]">Add FitTrack to your phone</h1>
        <p className="text-sm text-[var(--muted)]">
          Install the app for a faster full-screen experience and quick access from your home screen.
        </p>

        {deferredPrompt ? (
          <button
            type="button"
            onClick={() => void triggerInstall()}
            disabled={isInstalling}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#BEFF47,#7E73F6)] py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Download size={16} />
            {isInstalling ? "Opening install prompt…" : "Install app"}
          </button>
        ) : isIos ? (
          <div className="rounded-xl border border-white/12 bg-white/[0.04] p-3 text-xs text-[var(--muted)]">
            On iPhone/iPad: tap <strong>Share</strong> in Safari, then choose <strong>Add to Home Screen</strong>.
          </div>
        ) : (
          <div className="rounded-xl border border-white/12 bg-white/[0.04] p-3 text-xs text-[var(--muted)]">
            Install prompt is unavailable on this browser right now. You can continue and install later from browser menu.
          </div>
        )}

        {message ? <p className="text-xs text-emerald-400">{message}</p> : null}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.push(next)}
            className="w-full rounded-xl border border-white/14 py-2.5 text-sm font-semibold text-white/90 hover:bg-white/[0.05]"
          >
            Continue
          </button>
          <Link
            href="/dashboard"
            className="w-full rounded-xl border border-white/14 py-2.5 text-center text-sm font-semibold text-white/60 hover:bg-white/[0.05]"
          >
            Skip
          </Link>
        </div>
      </div>
    </div>
  );
}

function InstallAppFallback() {
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="premium-card space-y-4 rounded-2xl p-5">
        <p className="text-sm text-[var(--muted)]">Loading install options…</p>
      </div>
    </div>
  );
}

export default function InstallAppPage() {
  return (
    <Suspense fallback={<InstallAppFallback />}>
      <InstallAppPageContent />
    </Suspense>
  );
}
