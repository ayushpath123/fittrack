"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Loader2, Mic, Square, X, XCircle } from "lucide-react";
import { useVoice } from "@/components/voice/VoiceLayer";
import { cn } from "@/lib/utils";
import { useHydrated } from "@/hooks/useHydrated";

const EXAMPLE_PROMPTS = [
  "I had 2 eggs and a coffee",
  "Bench press 80 kg for 5 reps",
  "Weighed 72.4 kg this morning",
  "Drank 500 ml of water",
] as const;

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function phaseLabel(phase: ReturnType<typeof useVoice>["phase"]): string {
  if (phase === "preparing") return "Preparing…";
  if (phase === "recording") return "Recording";
  if (phase === "transcribing") return "Transcribing…";
  if (phase === "processing") return "Understanding…";
  if (phase === "logging") return "Logging…";
  return "Voice log";
}

export function VoiceRecordingOverlay() {
  const { overlayOpen, phase, statusText, result, recordingStartedAt, onMicPress, cancelVoice } = useVoice();
  const mounted = useHydrated();
  const [elapsedMs, setElapsedMs] = useState(0);
  const [exampleIndex] = useState(() => Math.floor(Math.random() * EXAMPLE_PROMPTS.length));

  // Reset the timer whenever the active recording session changes (render-time
  // state adjustment instead of a cascading effect).
  const activeStartedAt = overlayOpen && phase === "recording" ? (recordingStartedAt ?? null) : null;
  const [prevStartedAt, setPrevStartedAt] = useState<number | null>(null);
  if (activeStartedAt !== prevStartedAt) {
    setPrevStartedAt(activeStartedAt);
    // The interval below corrects this within 250ms; a fresh recording is ~0 anyway.
    setElapsedMs(0);
  }

  useEffect(() => {
    if (!overlayOpen || phase !== "recording" || !recordingStartedAt) return;
    const tick = () => setElapsedMs(Math.max(0, Date.now() - recordingStartedAt));
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [overlayOpen, phase, recordingStartedAt]);

  useEffect(() => {
    if (!overlayOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && phase !== "transcribing" && phase !== "processing" && phase !== "logging") {
        cancelVoice();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [overlayOpen, phase, cancelVoice]);

  if (!mounted || !overlayOpen) return null;

  const isRecording = phase === "recording";
  const isBusy = phase === "preparing" || phase === "transcribing" || phase === "processing" || phase === "logging";
  const canCancel = !isBusy;
  const showResult = result && phase === "idle";

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex flex-col bg-[#090b12]/98 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-label="Voice logging"
    >
      <div className="mx-auto flex h-full w-full max-w-md flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <div className="flex shrink-0 items-center justify-between">
          <p className="text-sm font-semibold text-[var(--white)]">Voice log</p>
          {canCancel ? (
            <button
              type="button"
              onClick={cancelVoice}
              aria-label="Close voice logging"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[var(--muted)] transition active:scale-95"
            >
              <X size={18} />
            </button>
          ) : (
            <div className="h-9 w-9" aria-hidden />
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
          {showResult ? (
            <div className="w-full max-w-sm px-2">
              <div
                className={cn(
                  "mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border",
                  result.tone === "success"
                    ? "border-[rgba(190,255,71,.45)] bg-[rgba(190,255,71,.12)]"
                    : "border-[rgba(255,125,149,.45)] bg-[rgba(255,125,149,.12)]",
                )}
              >
                {result.tone === "success" ? (
                  <CheckCircle2 size={32} className="text-[#BEFF47]" />
                ) : (
                  <XCircle size={32} className="text-[#ff7d95]" />
                )}
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                {result.tone === "success" ? "Logged" : "Could not log"}
              </p>
              <p className="mt-2 text-base text-[var(--white)]">{result.message}</p>
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center gap-2">
                {isRecording ? (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#BEFF47] opacity-60" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#BEFF47]" />
                  </span>
                ) : isBusy ? (
                  <Loader2 size={16} className="animate-spin text-[#BEFF47]" />
                ) : null}
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#BEFF47]">
                  {phaseLabel(phase)}
                </span>
                {isRecording ? (
                  <span className="font-mono text-xs tabular-nums text-[var(--muted)]">
                    {formatElapsed(elapsedMs)}
                  </span>
                ) : null}
              </div>

              <p className="max-w-xs text-sm leading-relaxed text-[var(--white)]">{statusText}</p>

              {!isBusy && !isRecording ? (
                <p className="mt-4 max-w-xs text-xs text-[var(--muted)]">
                  Try: &ldquo;{EXAMPLE_PROMPTS[exampleIndex]}&rdquo;
                </p>
              ) : null}
            </>
          )}
        </div>

        {!showResult ? (
          <div className="flex shrink-0 flex-col items-center gap-4 pb-2">
            <button
              type="button"
              aria-label={isRecording ? "Tap to finish and log" : "Tap to start recording"}
              aria-pressed={isRecording}
              disabled={isBusy}
              onClick={(e) => {
                e.preventDefault();
                onMicPress();
              }}
              className={cn(
                "relative flex h-28 w-28 select-none items-center justify-center rounded-full border-2 transition-all duration-200",
                isRecording
                  ? "scale-105 border-[rgba(190,255,71,.7)] bg-[rgba(190,255,71,.18)] shadow-[0_0_40px_rgba(190,255,71,.35)]"
                  : "border-[rgba(190,255,71,.45)] bg-[rgba(190,255,71,.1)] shadow-[0_0_28px_rgba(190,255,71,.2)] active:scale-95",
                isBusy && "opacity-60",
              )}
            >
              {isRecording ? (
                <>
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 animate-pulse rounded-full ring-2 ring-[rgba(190,255,71,.35)]"
                  />
                  <Square size={36} className="relative fill-[#BEFF47] text-[#BEFF47]" />
                </>
              ) : isBusy ? (
                <Loader2 size={40} className="animate-spin text-[#BEFF47]" />
              ) : (
                <Mic size={40} className="text-[#BEFF47]" />
              )}
            </button>

            <p className="text-center text-xs text-[var(--muted)]">
              {isRecording
                ? "Tap again when you’re done speaking"
                : isBusy
                  ? "Please wait…"
                  : "Tap the mic to start, tap again to log"}
            </p>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
