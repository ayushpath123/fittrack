"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => {
  detect: (source: ImageBitmapSource) => Promise<{ rawValue: string }[]>;
};

function getBarcodeDetector(): BarcodeDetectorCtor | null {
  if (typeof window === "undefined") return null;
  const B = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  return B ?? null;
}

const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "itf", "code_128"];

type Props = {
  open: boolean;
  onClose: () => void;
  onCode: (code: string) => void;
};

export function BarcodeScanModal({ open, onClose, onCode }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const onCodeRef = useRef(onCode);
  const onCloseRef = useRef(onClose);
  const [hint, setHint] = useState("");

  useEffect(() => {
    onCodeRef.current = onCode;
    onCloseRef.current = onClose;
  }, [onCode, onClose]);

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    if (!open) {
      stopCamera();
      return;
    }

    const Detector = getBarcodeDetector();
    if (!Detector) {
      const timeout = setTimeout(() => {
        setHint("Camera scanning is not supported in this browser.");
      }, 0);
      return () => clearTimeout(timeout);
    }

    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          await v.play();
        }
        const detector = new Detector({ formats: FORMATS });

        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          const video = videoRef.current;
          if (video.readyState >= 2) {
            try {
              const codes = await detector.detect(video);
              const raw = codes[0]?.rawValue;
              if (raw) {
                const digits = raw.replace(/\D/g, "");
                if (digits.length >= 8 && digits.length <= 14) {
                  stopCamera();
                  onCodeRef.current(digits);
                  onCloseRef.current();
                  return;
                }
              }
            } catch {
              /* frame detect failed; continue */
            }
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        setHint("Could not access the camera. Check permissions or enter the code manually.");
      }
    })();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open, stopCamera]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50" role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-2xl border-t border-gray-100 dark:border-slate-700 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold text-gray-900 dark:text-white">Scan barcode</h3>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 rounded-xl text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
            aria-label="Close scanner"
          >
            <X size={20} />
          </button>
        </div>
        <div className="rounded-xl overflow-hidden bg-black aspect-[4/3] relative">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
        </div>
        {hint ? <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">{hint}</p> : null}
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">Point the camera at a product barcode. Works best in good light.</p>
      </div>
    </div>
  );
}
