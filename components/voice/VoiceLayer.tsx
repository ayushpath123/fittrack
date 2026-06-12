"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { CheckCircle2, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { VoiceRecordingOverlay } from "@/components/voice/VoiceRecordingOverlay";
import { useAudioRecorder } from "@/components/voice/useAudioRecorder";
import { notifyLogsUpdated } from "@/lib/fittrack-events";
import { useHydrated } from "@/hooks/useHydrated";

type ProStatus = "loading" | "pro" | "free";
type VoicePhase = "idle" | "preparing" | "recording" | "transcribing" | "processing" | "logging";

const STATUS_TOAST_ID = "voice-pipeline";
const RESULT_VISIBLE_MS = 12_000;
const OVERLAY_RESULT_MS = 2_800;

type VoiceResult = { tone: "success" | "error"; message: string };

type VoiceContextValue = {
  phase: VoicePhase;
  statusText: string;
  proStatus: ProStatus;
  overlayOpen: boolean;
  result: VoiceResult | null;
  recordingStartedAt: number | null;
  openVoiceOverlay: () => void;
  closeVoiceOverlay: () => void;
  cancelVoice: () => void;
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
  result,
}: {
  phase: VoicePhase;
  result: VoiceResult | null;
}) {
  const mounted = useHydrated();

  const visible = result !== null && phase === "idle";
  if (!mounted || !visible || !result) return null;

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

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const { status: sessionStatus } = useSession();
  const recorder = useAudioRecorder();
  const [proStatus, setProStatus] = useState<ProStatus>("loading");
  const proStatusRef = useRef<ProStatus>("loading");
  const [phase, setPhase] = useState<VoicePhase>("idle");
  const phaseRef = useRef<VoicePhase>("idle");
  const [statusText, setStatusText] = useState("Tap the mic to start recording");
  const [result, setResult] = useState<VoiceResult | null>(null);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const overlayOpenRef = useRef(false);
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null);
  const pipelineBusyRef = useRef(false);
  const maxDurationRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overlayCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelRecordingRef = useRef(recorder.cancel);
  cancelRecordingRef.current = recorder.cancel;

  const setVoicePhase = useCallback((next: VoicePhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const setOverlay = useCallback((open: boolean) => {
    overlayOpenRef.current = open;
    setOverlayOpen(open);
  }, []);

  const resetIdle = useCallback(() => {
    setVoicePhase("idle");
    setStatusText("Tap the mic to start recording");
    setRecordingStartedAt(null);
  }, [setVoicePhase]);

  const dismissStatusToast = useCallback(() => {
    toast.dismiss(STATUS_TOAST_ID);
  }, []);

  const scheduleOverlayClose = useCallback(() => {
    if (overlayCloseTimerRef.current) clearTimeout(overlayCloseTimerRef.current);
    overlayCloseTimerRef.current = setTimeout(() => {
      setOverlay(false);
      setResult(null);
    }, OVERLAY_RESULT_MS);
  }, [setOverlay]);

  const showResult = useCallback(
    (tone: VoiceResult["tone"], message: string) => {
      setResult({ tone, message });
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
      resultTimerRef.current = setTimeout(() => {
        if (!overlayOpenRef.current) setResult(null);
      }, RESULT_VISIBLE_MS);

      dismissStatusToast();

      if (overlayOpenRef.current) {
        scheduleOverlayClose();
        return;
      }

      if (tone === "success") {
        toast.success(message, { id: STATUS_TOAST_ID, duration: RESULT_VISIBLE_MS });
      } else {
        toast.error(message, { id: STATUS_TOAST_ID, duration: RESULT_VISIBLE_MS });
      }
    },
    [dismissStatusToast, scheduleOverlayClose],
  );

  const setProgress = useCallback(
    (nextPhase: VoicePhase, text: string) => {
      setResult(null);
      setVoicePhase(nextPhase);
      setStatusText(text);
      if (!overlayOpenRef.current) {
        toast.loading(text, { id: STATUS_TOAST_ID, duration: Infinity });
      }
    },
    [setVoicePhase],
  );

  const openVoiceOverlay = useCallback(() => {
    setOverlay(true);
    dismissStatusToast();
  }, [dismissStatusToast, setOverlay]);

  const closeVoiceOverlay = useCallback(() => {
    if (phaseRef.current !== "idle" || pipelineBusyRef.current) return;
    setOverlay(false);
    setResult(null);
  }, [setOverlay]);

  const cancelVoice = useCallback(() => {
    if (
      phaseRef.current === "transcribing" ||
      phaseRef.current === "processing" ||
      phaseRef.current === "logging" ||
      phaseRef.current === "preparing"
    ) {
      return;
    }

    if (phaseRef.current === "recording" || recorder.recording) {
      recorder.cancel();
    }

    pipelineBusyRef.current = false;
    if (maxDurationRef.current) {
      clearTimeout(maxDurationRef.current);
      maxDurationRef.current = null;
    }
    if (overlayCloseTimerRef.current) clearTimeout(overlayCloseTimerRef.current);

    dismissStatusToast();
    resetIdle();
    setResult(null);
    setOverlay(false);
  }, [dismissStatusToast, recorder, resetIdle, setOverlay]);

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
      if (overlayCloseTimerRef.current) clearTimeout(overlayCloseTimerRef.current);
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
      showResult("error", "Not recording — tap the mic to start.");
      return;
    }

    pipelineBusyRef.current = true;
    setRecordingStartedAt(null);
    setProgress("transcribing", "Stopping recording…");

    try {
      const audio = await recorder.stop();

      if (!audio) {
        showResult("error", "No audio captured — speak longer and try again.");
        return;
      }

      if (audio.durationMs < 700) {
        showResult("error", "Too short — speak at least 1 second before tapping again.");
        return;
      }

      const pipelineResult = await runVoicePipeline(audio.blob);
      if ("error" in pipelineResult) {
        showResult("error", pipelineResult.error);
        return;
      }

      showResult("success", pipelineResult.message);
    } catch (err) {
      console.error("[voice] pipeline error", err);
      showResult("error", "Something went wrong — please try again.");
    } finally {
      pipelineBusyRef.current = false;
      resetIdle();
    }
  }, [recorder, resetIdle, runVoicePipeline, showResult, setProgress]);

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
      setRecordingStartedAt(Date.now());
      setVoicePhase("recording");
      setStatusText("Speak now — tap the mic again when you're done");
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
        overlayOpen,
        result,
        recordingStartedAt,
        openVoiceOverlay,
        closeVoiceOverlay,
        cancelVoice,
        onMicPress,
      }}
    >
      {children}
      <VoiceRecordingOverlay />
      <VoiceBanner phase={phase} result={result} />
    </VoiceContext.Provider>
  );
}
