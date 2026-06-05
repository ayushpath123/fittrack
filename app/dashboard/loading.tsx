export default function Loading() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-16 rounded-[var(--radius-card)] bg-white/[0.06]" />
      <div className="h-44 rounded-[var(--radius-card)] bg-white/[0.06]" />
      <div className="h-28 rounded-[var(--radius-card)] bg-white/[0.06]" />
      <div className="h-36 rounded-[var(--radius-card)] bg-white/[0.06]" />
      <div className="h-52 rounded-[var(--radius-card)] bg-white/[0.06]" />
      <div className="flex gap-2">
        <div className="h-20 min-w-[11rem] rounded-xl bg-white/[0.06]" />
        <div className="h-20 min-w-[11rem] rounded-xl bg-white/[0.06]" />
      </div>
      <div className="flex gap-2">
        <div className="h-24 min-w-[8.5rem] rounded-xl bg-white/[0.06]" />
        <div className="h-24 min-w-[8.5rem] rounded-xl bg-white/[0.06]" />
        <div className="h-24 min-w-[8.5rem] rounded-xl bg-white/[0.06]" />
      </div>
      <div className="h-40 rounded-[var(--radius-card)] bg-white/[0.06]" />
    </div>
  );
}
