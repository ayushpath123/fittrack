"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const TIMESLICE_MS = 250;

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  if (MediaRecorder.isTypeSupported("audio/aac")) return "audio/aac";
  return "";
}

export function useAudioRecorder() {
  const [recording, setRecording] = useState(false);
  const [supported, setSupported] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef("audio/webm");
  const startedAtRef = useRef(0);

  useEffect(() => {
    setSupported(typeof MediaRecorder !== "undefined" && !!pickMimeType());
  }, []);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    setRecording(false);
  }, []);

  const start = useCallback(async (): Promise<{ ok: true } | { ok: false; error: string }> => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      return { ok: false, error: "Microphone not available in this browser." };
    }

    const preferredMime = pickMimeType();
    if (!preferredMime) {
      return { ok: false, error: "Audio recording not supported in this browser." };
    }

    try {
      releaseStream();
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, { mimeType: preferredMime });
        mimeTypeRef.current = preferredMime;
      } catch {
        recorder = new MediaRecorder(stream);
        mimeTypeRef.current = recorder.mimeType || preferredMime || "audio/webm";
      }

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current = recorder;
      // Timeslice ensures chunks arrive during recording, not only on stop
      recorder.start(TIMESLICE_MS);
      startedAtRef.current = Date.now();
      setRecording(true);
      setSupported(true);
      return { ok: true };
    } catch (err) {
      releaseStream();
      chunksRef.current = [];
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        return { ok: false, error: "Microphone blocked — allow mic access in browser settings." };
      }
      return { ok: false, error: "Could not access microphone." };
    }
  }, [releaseStream]);

  const stop = useCallback((): Promise<{ blob: Blob; mimeType: string; durationMs: number } | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      const durationMs = Math.max(0, Date.now() - startedAtRef.current);

      const finish = (result: { blob: Blob; mimeType: string; durationMs: number } | null) => {
        chunksRef.current = [];
        releaseStream();
        resolve(result);
      };

      if (!recorder) {
        finish(null);
        return;
      }

      const buildBlob = () => {
        const mimeType = recorder.mimeType || mimeTypeRef.current;
        const blob = new Blob(chunksRef.current, { type: mimeType });
        return blob.size > 0 ? { blob, mimeType, durationMs } : null;
      };

      if (recorder.state === "inactive") {
        finish(buildBlob());
        return;
      }

      let settled = false;
      const complete = () => {
        if (settled) return;
        settled = true;
        finish(buildBlob());
      };

      recorder.onstop = () => {
        // Allow final dataavailable events to land after stop
        window.setTimeout(complete, 200);
      };

      try {
        if (recorder.state === "recording" && typeof recorder.requestData === "function") {
          recorder.requestData();
        }
        recorder.stop();
      } catch {
        complete();
      }

      window.setTimeout(complete, 3000);
    });
  }, [releaseStream]);

  const cancel = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = () => {
        chunksRef.current = [];
        releaseStream();
      };
      try {
        recorder.stop();
      } catch {
        chunksRef.current = [];
        releaseStream();
      }
    } else {
      chunksRef.current = [];
      releaseStream();
    }
  }, [releaseStream]);

  const isActive = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    return !!recorder && recorder.state === "recording";
  }, []);

  return useMemo(
    () => ({ supported, recording, start, stop, cancel, isActive }),
    [supported, recording, start, stop, cancel, isActive],
  );
}
