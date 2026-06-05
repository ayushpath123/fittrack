"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
};

export function BottomSheet({ open, onClose, title, children, className }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative z-10 w-full max-w-md rounded-t-[1.35rem] border border-white/10 bg-[rgba(12,14,22,.98)] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 shadow-2xl",
          className,
        )}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
        {title ? (
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--white)]">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close sheet"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-[var(--muted)]"
            >
              <X size={16} />
            </button>
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
