"use client";

import { Check, ChevronDown, Loader2 } from "lucide-react";
import { BottomSheet } from "@/components/meal-templates/BottomSheet";
import { cn } from "@/lib/utils";
import type { MatchCandidate, VoiceDraftItem } from "@/lib/voice/types";

type VoiceConfirmationSheetProps = {
  open: boolean;
  onClose: () => void;
  items: VoiceDraftItem[];
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
  onSelectAlternative: (draftId: string, match: MatchCandidate) => void;
};

function statusIcon(status: VoiceDraftItem["status"]) {
  if (status === "auto") return <Check size={14} className="text-[#BEFF47]" />;
  if (status === "suggest") return <span className="text-[10px] text-amber-400">?</span>;
  return <span className="text-[10px] text-rose-400">!</span>;
}

export function VoiceConfirmationSheet({
  open,
  onClose,
  items,
  onConfirm,
  onCancel,
  busy,
  onSelectAlternative,
}: VoiceConfirmationSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Confirm logs">
      <div className="space-y-3 pb-2">
        <p className="text-xs text-[var(--muted)]">Review what AI understood before saving.</p>

        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
            >
              <div className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.06]">
                  {statusIcon(item.status)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-[var(--white)]">{item.label}</span>
                    <span
                      className={cn(
                        "shrink-0 text-[10px] font-semibold",
                        item.confidence >= 85
                          ? "text-[#BEFF47]"
                          : item.confidence >= 60
                            ? "text-amber-400"
                            : "text-rose-400",
                      )}
                    >
                      {item.confidence}%
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-[var(--muted)]">&ldquo;{item.raw}&rdquo;</p>

                  {item.alternatives && item.alternatives.length > 0 && item.status !== "auto" ? (
                    <details className="mt-2 group">
                      <summary className="flex cursor-pointer list-none items-center gap-1 text-[11px] text-[#BEFF47]">
                        <ChevronDown size={12} className="transition group-open:rotate-180" />
                        Did you mean something else?
                      </summary>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {item.alternatives.map((alt) => (
                          <button
                            key={alt.id}
                            type="button"
                            onClick={() => onSelectAlternative(item.id, alt)}
                            className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-[var(--white)] transition hover:border-[#BEFF47]/40"
                          >
                            {alt.name} ({alt.confidence}%)
                          </button>
                        ))}
                      </div>
                    </details>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-[var(--muted)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy || items.length === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#BEFF47] py-2.5 text-sm font-semibold text-[#0a0c12] disabled:opacity-50"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Save
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
