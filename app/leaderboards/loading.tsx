export default function LeaderboardsLoading() {
  return (
    <div className="space-y-3 py-1">
      <div className="h-20 animate-pulse rounded-2xl bg-white/[0.06]" />
      <div className="grid grid-cols-3 gap-2">
        <div className="h-28 animate-pulse rounded-2xl bg-white/[0.06]" />
        <div className="h-28 animate-pulse rounded-2xl bg-white/[0.06]" />
        <div className="h-28 animate-pulse rounded-2xl bg-white/[0.06]" />
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-white/[0.06]" />
    </div>
  );
}
