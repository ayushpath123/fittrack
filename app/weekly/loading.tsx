import { SkeletonCard } from "@/components/SkeletonCard";

export default function WeeklyLoading() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-8 w-44 rounded-lg bg-gray-200 dark:bg-slate-700" />
      <SkeletonCard lines={3} />
      <SkeletonCard lines={2} />
      <SkeletonCard lines={2} />
    </div>
  );
}
