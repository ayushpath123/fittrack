"use client";

import { Loader2, Mic } from "lucide-react";
import { useVoice } from "@/components/voice/VoiceLayer";
import { cn } from "@/lib/utils";

export function VoiceHoldButton() {
  const { phase, onMicPress } = useVoice();

  const isListening = phase === "recording";
  const isBusy = phase === "transcribing" || phase === "processing" || phase === "logging";

  return (
    <button
      type="button"
      aria-label={isListening ? "Tap to finish and log" : "Tap to speak"}
      aria-pressed={isListening}
      disabled={isBusy}
      onClick={(e) => {
        e.preventDefault();
        onMicPress();
      }}
      className={cn(
        "flex h-9 w-9 select-none items-center justify-center rounded-xl border transition-transform duration-150",
        isListening && "scale-110 border-[rgba(190,255,71,.6)] shadow-[0_0_16px_rgba(190,255,71,.35)]",
        !isListening && !isBusy && "active:scale-90",
        isBusy && "opacity-70",
      )}
      style={{
        borderColor: isListening ? "rgba(190,255,71,.6)" : "var(--accent-border)",
        background: isListening ? "rgba(190,255,71,.2)" : "var(--accent-soft)",
      }}
    >
      {isBusy ? (
        <Loader2 size={16} className="animate-spin text-[#BEFF47]" />
      ) : (
        <Mic size={16} className={cn("text-[#BEFF47]", isListening && "animate-pulse")} />
      )}
    </button>
  );
}
