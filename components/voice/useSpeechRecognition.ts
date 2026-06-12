"use client";

import { useCallback, useRef, useState } from "react";
import { useHydrated } from "@/hooks/useHydrated";

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function errorMessage(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone blocked — allow mic access in browser settings.";
    case "no-speech":
      return "No speech detected — try again and speak clearly.";
    case "network":
      return "Speech recognition needs an internet connection.";
    case "aborted":
      return "";
    default:
      return `Mic error: ${code}`;
  }
}

export function useSpeechRecognition() {
  const hydrated = useHydrated();
  const supported = hydrated && !!getSpeechRecognition();
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [lastError, setLastError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const transcriptRef = useRef("");
  const interimRef = useRef("");
  const onErrorRef = useRef<((msg: string) => void) | null>(null);

  const setErrorHandler = useCallback((fn: ((msg: string) => void) | null) => {
    onErrorRef.current = fn;
  }, []);

  const abort = useCallback(() => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setListening(false);
    setInterim("");
    interimRef.current = "";
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) return false;

    setLastError(null);
    recognitionRef.current?.abort();

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result) continue;
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) finalText += text;
        else interimText += text;
      }
      if (finalText) {
        transcriptRef.current = `${transcriptRef.current} ${finalText}`.trim();
        setTranscript(transcriptRef.current);
      }
      interimRef.current = interimText;
      setInterim(interimText);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const msg = errorMessage(event.error);
      if (msg) {
        setLastError(msg);
        onErrorRef.current?.(msg);
      }
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    transcriptRef.current = "";
    interimRef.current = "";
    setTranscript("");
    setInterim("");

    try {
      recognition.start();
      setListening(true);
      return true;
    } catch {
      setLastError("Could not start microphone.");
      onErrorRef.current?.("Could not start microphone.");
      return false;
    }
  }, []);

  const stopAndCapture = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      const recognition = recognitionRef.current;
      const snapshot = () =>
        `${transcriptRef.current} ${interimRef.current}`.trim();

      if (!recognition) {
        resolve(snapshot());
        return;
      }

      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        recognitionRef.current = null;
        setListening(false);
        setInterim("");
        resolve(snapshot());
      };

      recognition.onend = () => {
        setTimeout(finish, 350);
      };

      try {
        recognition.stop();
      } catch {
        finish();
      }

      setTimeout(finish, 2000);
    });
  }, []);

  const reset = useCallback(() => {
    transcriptRef.current = "";
    interimRef.current = "";
    setTranscript("");
    setInterim("");
    setLastError(null);
  }, []);

  const liveText = `${transcript} ${interim}`.trim();

  return {
    supported,
    listening,
    transcript,
    interim,
    liveText,
    lastError,
    start,
    abort,
    stopAndCapture,
    reset,
    setErrorHandler,
  };
}
