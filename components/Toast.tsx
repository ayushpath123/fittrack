"use client";

export function Toast({
  message,
  type = "info",
  actionLabel,
  onAction,
}: {
  message: string;
  type?: "info" | "error" | "success";
  actionLabel?: string;
  onAction?: () => void;
}) {
  if (!message) return null;
  const color =
    type === "error"
      ? "border-red-500/30 bg-red-500/10 text-red-200"
      : type === "success"
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
        : "border-[#57B4FF]/25 bg-[#57B4FF]/08 text-[#B8E0FF]";
  return (
    <div className={`rounded-xl border px-3 py-2 text-xs backdrop-blur-sm ${color}`}>
      <div className="flex items-center justify-between gap-2">
        <span>{message}</span>
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="rounded-md border border-current/40 px-2 py-0.5 text-[10px] font-semibold hover:bg-white/5"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
