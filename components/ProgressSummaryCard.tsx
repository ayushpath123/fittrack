"use client";

export function ProgressSummaryCard({
  label,
  value,
  subtext,
  progress,
  progressTone = "green",
}: {
  label: string;
  value: string;
  subtext?: string;
  progress?: number;
  progressTone?: "green" | "amber" | "blue";
}) {
  const toneClass =
    progressTone === "amber" ? "bg-[#FFB547]" : progressTone === "blue" ? "bg-[#57B4FF]" : "bg-[#2DD4A0]";
  return (
    <div className="premium-card rounded-2xl p-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">{label}</p>
      <p className="num mt-1 text-xl font-bold text-[var(--white)]">{value}</p>
      {subtext ? <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">{subtext}</p> : null}
      {typeof progress === "number" ? (
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
          <div className={`h-full rounded-full shadow-[0_0_14px_rgba(190,255,71,.25)] ${toneClass}`} style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
        </div>
      ) : null}
    </div>
  );
}
