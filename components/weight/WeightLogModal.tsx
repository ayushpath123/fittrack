"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { validateWeightInput } from "@/lib/weight-analytics";
import { sanitizeNumericInput } from "@/lib/numeric-input";

type WeightLogModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (weight: number) => Promise<void>;
  initialValue?: string;
  title?: string;
};

export function WeightLogModal({
  open,
  onClose,
  onSave,
  initialValue = "",
  title = "Log Weight",
}: WeightLogModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const [input, setInput] = useState(initialValue);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setInput(initialValue);
      setError("");
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open, initialValue]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  async function handleSave() {
    const validationError = validateWeightInput(input);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(parseFloat(input));
      onClose();
    } catch {
      setError("Could not save weight. Please retry.");
    } finally {
      setSaving(false);
    }
  }

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center" role="presentation">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="weight-log-title"
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-md rounded-t-[1.35rem] border border-white/10 bg-[rgba(12,14,22,.98)] px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-3 shadow-2xl"
        style={{ animation: "sheet-up .35s cubic-bezier(.2,.8,.2,1)" }}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
        <div className="mb-4 flex items-center justify-between">
          <h2 id="weight-log-title" className="text-base font-semibold text-[var(--white)]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-[var(--muted)]"
            aria-label="Close modal"
          >
            <X size={16} aria-hidden />
          </button>
        </div>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Current weight (kg)</span>
          <div className="mt-2 flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={input}
              onChange={(e) => {
                setInput(sanitizeNumericInput(e.target.value));
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSave();
              }}
              placeholder="72.5"
              className="metric-value flex-1 rounded-xl border border-white/12 bg-white/[0.05] px-3.5 py-3 text-xl font-semibold text-[var(--white)] focus:border-[#A78BFA]/50 focus:outline-none"
            />
            <span className="text-sm font-medium text-[var(--muted)]">kg</span>
          </div>
        </label>

        {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-white/12 py-3 text-sm font-semibold text-[var(--muted)]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="flex-1 rounded-xl bg-[#A78BFA] py-3 text-sm font-semibold text-[#06080A] disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save Weight"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
