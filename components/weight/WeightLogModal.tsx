"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { validateWeightInput } from "@/lib/weight-analytics";

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
  const [input, setInput] = useState(initialValue);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

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
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

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

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="weight-log-title"
        className="relative z-10 w-full max-w-md rounded-t-2xl border border-white/[0.1] bg-[#0D0F18] p-5 shadow-2xl sm:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="weight-log-title" className="text-lg font-semibold text-[var(--white)]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-[var(--muted)]"
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
              type="number"
              inputMode="decimal"
              step="0.1"
              min={20}
              max={300}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setError("");
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
    </div>
  );
}
