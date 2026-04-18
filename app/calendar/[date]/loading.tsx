import { SkeletonCard } from "@/components/SkeletonCard";

export default function DayLoading() {
  return (
    <div className="space-y-3">
      <div className="h-8 w-56 bg-gray-200 dark:bg-slate-700 rounded-xl animate-pulse" />
      <SkeletonCard lines={3} />
      <SkeletonCard lines={2} />
    </div>
  );
}
