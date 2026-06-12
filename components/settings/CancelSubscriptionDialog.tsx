"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { useHydrated } from "@/hooks/useHydrated";

type CancelSubscriptionDialogProps = {
  open: boolean;
  accessUntil: string | null;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function CancelSubscriptionDialog({ open, accessUntil, busy, onClose, onConfirm }: CancelSubscriptionDialogProps) {
  const mounted = useHydrated();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, busy, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-4 backdrop-blur-[2px] sm:items-center"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-sub-title"
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#1C1C2C] p-5 shadow-[0_20px_50px_-12px_rgba(0,0,0,.7)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="cancel-sub-title" className="text-lg font-semibold text-[var(--white)]">
          Cancel Pro subscription?
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          {accessUntil
            ? `You'll keep Pro access until ${accessUntil}, and you won't be charged again.`
            : "You won't be charged again."}{" "}
          Your logged data stays untouched.
        </p>
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={busy}>
            Keep Pro
          </Button>
          <Button
            className="flex-1 bg-red-600 hover:bg-red-700"
            onClick={onConfirm}
            isLoading={busy}
            loadingText="Cancelling..."
          >
            Cancel subscription
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
