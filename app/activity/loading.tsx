export default function ActivityLoading() {
  return (
    <div className="space-y-3 py-1">
      <div className="h-16 animate-pulse rounded-2xl bg-white/[0.06]" />
      <div className="grid grid-cols-2 gap-2">
        <div className="h-24 animate-pulse rounded-2xl bg-white/[0.06]" />
        <div className="h-24 animate-pulse rounded-2xl bg-white/[0.06]" />
      </div>
      <div className="h-40 animate-pulse rounded-2xl bg-white/[0.06]" />
    </div>
  );
}
