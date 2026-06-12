"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Loader2, Share2 } from "lucide-react";
import { track } from "@/lib/analytics-client";

type ShareStreakButtonProps = {
  streak: number;
  level: number;
  rank: string;
};

/** Share a branded streak card via the Web Share API (file > text > open-image fallback). */
export function ShareStreakButton({ streak, level, rank }: ShareStreakButtonProps) {
  const [busy, setBusy] = useState(false);

  if (streak < 3) return null;

  async function share() {
    setBusy(true);
    track("share_clicked", { streak });
    const cardUrl = `/api/share-card?streak=${streak}&level=${level}&rank=${encodeURIComponent(rank)}`;
    const text = `${streak}-day logging streak on FitTrack — Level ${level} ${rank}. Join me:`;
    const url = window.location.origin;
    try {
      const res = await fetch(cardUrl);
      if (res.ok) {
        const blob = await res.blob();
        const file = new File([blob], "fittrack-streak.png", { type: "image/png" });
        if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], text, url });
          track("share_completed", { method: "file", streak });
          return;
        }
      }
      if (typeof navigator.share === "function") {
        await navigator.share({ text, url });
        track("share_completed", { method: "text", streak });
        return;
      }
      window.open(cardUrl, "_blank", "noopener");
      track("share_completed", { method: "open", streak });
      try {
        await navigator.clipboard.writeText(`${text} ${url}`);
        toast.success("Card opened in a new tab — invite link copied");
      } catch {
        toast.success("Card opened in a new tab");
      }
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        toast.error("Could not share right now");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void share()}
      disabled={busy}
      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-xs font-semibold text-[var(--muted)] transition-colors hover:border-[rgba(190,255,71,.25)] hover:text-[var(--white)] disabled:opacity-60"
    >
      {busy ? (
        <Loader2 size={14} className="animate-spin text-[#BEFF47]" aria-hidden />
      ) : (
        <Share2 size={14} className="text-[#BEFF47]" aria-hidden />
      )}
      Share your {streak}-day streak
    </button>
  );
}
