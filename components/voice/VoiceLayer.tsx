"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useAudioRecorder } from "@/components/voice/useAudioRecorder";
import { notifyLogsUpdated } from "@/lib/fittrack-events";

type ProStatus = "loading" | "pro" | "free";
type VoicePhase = "idle" | "preparing" | "recording" | "transcribing" | "processing" | "logging";

const STATUS_TOAST_ID = "voice-pipeline";
const RESULT_VISIBLE_MS = 12_000;

type VoiceResult = { tone: "success" | "error"; message: string };

type VoiceContextValue = {
  phase: VoicePhase;
  statusText: string;
  proStatus: ProStatus;
  onMicPress: () => void;
};

const VoiceContext = createContext<VoiceContextValue | null>(null);

export function useVoice() {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error("useVoice must be used within VoiceProvider");
  return ctx;
}

async function fetchProStatus(): Promise<ProStatus> {
  try {
    const res = await fetch("/api/billing/status", { credentials: "include" });
    if (!res.ok) return "free";
    const data = (await res.json()) as { hasPro?: boolean };
    return data.hasPro ? "pro" : "free";
  } catch {
    return "free";
  }
}

function parseApiError(res: Response, data: { error?: string; message?: string }, fallback: string): string {
  const err = data.error ?? data.message ?? "";
  if (res.status === 401 || err === "Unauthorized" || err === "StaleSession") {
    return "Session expired — refresh the page and sign in again.";
  }
  if (data.error === "PRO_REQUIRED") return "Voice logging requires Pro.";
  return data.message ?? data.error ?? fallback;
}

function VoiceBanner({
  phase,
  statusText,
  result,
}: {
  phase: VoicePhase;
  statusText: string;
  result: VoiceResult | null;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const visible = phase !== "idle" || result !== null;
  if (!mounted || !visible) return null;

  if (result && phase === "idle") {
    return createPortal(
      <div className="pointer-events-none fixed inset-x-0 top-[var(--app-header-h)] z-[85] flex justify-center px-3.5 pt-2">
        <div
          className={`w-full max-w-md rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-xl ${
            result.tone === "success"
              ? "border-[rgba(190,255,71,.45)] bg-[rgba(12,14,22,.98)]"
              : "border-[rgba(255,125,149,.45)] bg-[rgba(12,14,22,.98)]"
          }`}
        >
          <div className="flex items-start gap-2.5">
            {result.tone === "success" ? (
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#BEFF47]" />
            ) : (
              <XCircle size={18} className="mt-0.5 shrink-0 text-[#ff7d95]" />
            )}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                {result.tone === "success" ? "Logged" : "Could not log"}
              </p>
              <p className="mt-0.5 text-sm text-[var(--white)]">{result.message}</p>
            </div>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  const label =
    phase === "preparing"
      ? "Preparing…"
      : phase === "recording"
        ? "Recording — tap mic when done"
        : phase === "transcribing"
          ? "Transcribing…"
          : phase === "processing"
            ? "Understanding…"
            : "Logging…";

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-[var(--app-header-h)] z-[85] flex justify-center px-3.5 pt-2">
      <div className="w-full max-w-md rounded-2xl border border-[rgba(190,255,71,.25)] bg-[rgba(12,14,22,.98)] px-4 py-3 shadow-lg backdrop-blur-xl">
        <div className="mb-1.5 flex items-center gap-2">
          {phase === "recording" ? (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#BEFF47] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#BEFF47]" />
            </span>
          ) : (
            <Loader2 size={14} className="animate-spin text-[#BEFF47]" />
          )}
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[#BEFF47]">{label}</span>
        </div>
        <p className="line-clamp-4 text-sm text-[var(--white)]">{statusText}</p>
      </div>
    </div>,
    document.body,
  );
}

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const { status: sessionStatus } = useSession();
  const recorder = useAudioRecorder();
  const [proStatus, setProStatus] = useState<ProStatus>("loading");
  const proStatusRef = useRef<ProStatus>("loading");
  const [phase, setPhase] = useState<VoicePhase>("idle");
  const phaseRef = useRef<VoicePhase>("idle");
  const [statusText, setStatusText] = useState("Tap mic to start");
  const [result, setResult] = useState<VoiceResult | null>(null);
  const pipelineBusyRef = useRef(false);
  const maxDurationRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelRecordingRef = useRef(recorder.cancel);
  cancelRecordingRef.current = recorder.cancel;

  const setVoicePhase = useCallback((next: VoicePhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const resetIdle = useCallback(() => {
    setVoicePhase("idle");
    setStatusText("Tap mic to start");
  }, [setVoicePhase]);

  const showResult = useCallback((tone: VoiceResult["tone"], message: string) => {
    setResult({ tone, message });
    if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    resultTimerRef.current = setTimeout(() => setResult(null), RESULT_VISIBLE_MS);

    if (tone === "success") {
      toast.success(message, { id: STATUS_TOAST_ID, duration: RESULT_VISIBLE_MS });
    } else {
      toast.error(message, { id: STATUS_TOAST_ID, duration: RESULT_VISIBLE_MS });
    }
  }, []);

  const setProgress = useCallback(
    (nextPhase: VoicePhase, text: string) => {
      setResult(null);
      setVoicePhase(nextPhase);
      setStatusText(text);
      toast.loading(text, { id: STATUS_TOAST_ID, duration: Infinity });
    },
    [setVoicePhase],
  );

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (sessionStatus !== "authenticated") {
      proStatusRef.current = "free";
      setProStatus("free");
      return;
    }
    void fetchProStatus().then((status) => {
      proStatusRef.current = status;
      setProStatus(status);
    });
  }, [sessionStatus]);

  useEffect(() => {
    return () => {
      if (maxDurationRef.current) clearTimeout(maxDurationRef.current);
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
      cancelRecordingRef.current();
    };
  }, []);

  const ensurePro = useCallback(async (): Promise<boolean> => {
    if (proStatusRef.current === "pro") return true;
    if (sessionStatus !== "authenticated") {
      showResult("error", "Sign in to use voice logging.");
      return false;
    }
    const status = await fetchProStatus();
    proStatusRef.current = status;
    setProStatus(status);
    if (status !== "pro") {
      showResult("error", "Voice logging requires Pro.");
      return false;
    }
    return true;
  }, [sessionStatus, showResult]);

  const runVoicePipeline = useCallback(
    async (blob: Blob): Promise<{ ok: true; message: string; transcript: string } | { error: string }> => {
      setProgress("transcribing", "Processing your voice…");

      try {
        const form = new FormData();
        form.append("audio", blob, "recording.webm");

        const res = await fetch("/api/voice/pipeline", {
          method: "POST",
          credentials: "include",
          body: form,
        });

        let data: { transcript?: string; message?: string; error?: string } = {};
        try {
          data = await res.json();
        } catch {
          return { error: "Voice pipeline failed — invalid server response." };
        }

        if (!res.ok) {
          return { error: parseApiError(res, data, "Voice logging failed.") };
        }

        const transcript = data.transcript?.trim() ?? "";
        if (transcript) setStatusText(`Heard: "${transcript}"`);

        const message = data.message?.trim();
        if (!message) {
          return { error: "Nothing was logged — try again." };
        }

        notifyLogsUpdated();
        return { ok: true, message, transcript };
      } catch {
        return { error: "Network error — check connection and try again." };
      }
    },
    [setProgress],
  );

  const stopRecordingAndLog = useCallback(async () => {
    if (pipelineBusyRef.current) return;

    if (maxDurationRef.current) {
      clearTimeout(maxDurationRef.current);
      maxDurationRef.current = null;
    }

    if (phaseRef.current !== "recording" && !recorder.recording) {
      showResult("error", "Not recording — tap mic to start.");
      return;
    }

    pipelineBusyRef.current = true;
    setProgress("transcribing", "Stopping recording…");

    try {
      const audio = await recorder.stop();

      if (!audio) {
        showResult("error", "No audio captured — speak longer and try again.");
        return;
      }

      if (audio.durationMs < 700) {
        showResult("error", "Too short — speak at least 1 second before tapping mic again.");
        return;
      }

      const result = await runVoicePipeline(audio.blob);
      if ("error" in result) {
        showResult("error", result.error);
        return;
      }

      showResult("success", result.message);
    } catch (err) {
      console.error("[voice] pipeline error", err);
      showResult("error", "Something went wrong — please try again.");
    } finally {
      pipelineBusyRef.current = false;
      resetIdle();
    }
  }, [recorder, resetIdle, runVoicePipeline, showResult]);

  const startRecording = useCallback(async () => {
    if (pipelineBusyRef.current) return;
    if (phaseRef.current !== "idle") {
      if (phaseRef.current === "recording" || recorder.recording) {
        void stopRecordingAndLog();
      }
      return;
    }

    setResult(null);
    pipelineBusyRef.current = true;
    setProgress("preparing", "Checking access & microphone…");
    let recordingStarted = false;

    try {
      const ok = await ensurePro();
      if (!ok) return;

      const startResult = await recorder.start();
      if (!startResult.ok) {
        showResult("error", startResult.error);
        return;
      }

      recordingStarted = true;
      setVoicePhase("recording");
      setStatusText("Speak now — tap mic when done");
      toast("Recording — tap mic when finished", { id: STATUS_TOAST_ID, duration: Infinity });
    } catch (err) {
      console.error("[voice] start error", err);
      showResult("error", "Could not start recording.");
    } finally {
      pipelineBusyRef.current = false;
      if (!recordingStarted) {
        resetIdle();
      }
    }
  }, [ensurePro, recorder, resetIdle, setProgress, setVoicePhase, showResult, stopRecordingAndLog]);

  const onMicPress = useCallback(() => {
    if (phaseRef.current === "recording" || recorder.recording) {
      void stopRecordingAndLog();
      return;
    }
    if (phaseRef.current === "idle") {
      void startRecording();
    }
  }, [recorder, startRecording, stopRecordingAndLog]);

  return (
    <VoiceContext.Provider
      value={{
        phase,
        statusText,
        proStatus,
        onMicPress,
      }}
    >
      {children}
      <VoiceBanner phase={phase} statusText={statusText} result={result} />
    </VoiceContext.Provider>
  );
}
