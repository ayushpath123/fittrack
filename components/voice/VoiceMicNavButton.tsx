"use client";

import { Loader2, Mic } from "lucide-react";
import { useVoice } from "@/components/voice/VoiceLayer";
import { cn } from "@/lib/utils";

export function VoiceMicNavButton() {
  const { phase, overlayOpen, openVoiceOverlay } = useVoice();

  const isRecording = phase === "recording";
  const isBusy = phase === "transcribing" || phase === "processing" || phase === "logging" || phase === "preparing";

  return (
    <button
      type="button"
      aria-label="Open voice logging"
      aria-pressed={overlayOpen || isRecording}
      onClick={() => openVoiceOverlay()}
      className={cn(
        "relative -translate-y-2 flex h-12 w-12 items-center justify-center rounded-full border transition-all active:scale-95",
        isRecording
          ? "border-[rgba(190,255,71,.65)] bg-[rgba(190,255,71,.16)] text-[#BEFF47] shadow-[0_0_20px_rgba(190,255,71,.35)]"
          : "border-[rgba(190,255,71,.4)] bg-[rgba(190,255,71,.12)] text-[#BEFF47] shadow-[0_4px_16px_-4px_rgba(0,0,0,.5)]",
      )}
    >
      {isBusy && !isRecording ? (
        <Loader2 size={20} className="animate-spin" />
      ) : (
        <Mic size={20} strokeWidth={2.25} className={cn(isRecording && "animate-pulse")} />
      )}
    </button>
  );
}
