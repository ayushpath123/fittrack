import { SkeletonCard } from "@/components/SkeletonCard";

export default function SettingsLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-32 bg-gray-200 dark:bg-slate-700 rounded-lg" />
      <SkeletonCard lines={2} />
      <SkeletonCard lines={4} />
      <SkeletonCard lines={3} />
    </div>
  );
}
