interface MetricCardProps {
  label: string;
  value: number;
  unit: string;
  target?: number;
  color?: "blue" | "green" | "red" | "orange";
}

export function MetricCard({ label, value, unit, target, color = "blue" }: MetricCardProps) {
  const pct =
    target != null && target > 0 ? Math.min((value / target) * 100, 100) : target === 0 ? 0 : null;
  const over = target != null && value > target;
  const barClass =
    color === "green"
      ? "bg-emerald-500"
      : over
        ? "bg-red-500"
        : color === "orange"
          ? "bg-amber-500"
          : "bg-[#BEFF47]";

  const remainderText =
    target != null
      ? unit === "kcal"
        ? over
          ? `${Math.round(value - target)} kcal over`
          : `${Math.round(target - value)} kcal left`
        : over
          ? `${Math.round(value - target)}g over`
          : `${Math.round(target - value)}g to go`
      : null;

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 backdrop-blur-sm">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)]">{label}</p>
      <p className="metric-value mt-1 text-3xl font-bold tracking-tight text-[var(--white)]">
        {unit === "kcal" ? Math.round(value).toLocaleString() : Math.round(value)}
        <span className="ml-1 text-sm font-normal text-[var(--hint)]">{unit}</span>
      </p>
      {target != null && pct != null && (
        <>
          <div className="mt-2 h-1.5 rounded-full bg-white/[0.1]">
            <div className={`h-full rounded-full ${barClass}`} style={{ width: `${pct}%` }} />
          </div>
          {remainderText && <p className="mt-1.5 text-[11px] text-[var(--muted)]">{remainderText}</p>}
        </>
      )}
    </div>
  );
}
