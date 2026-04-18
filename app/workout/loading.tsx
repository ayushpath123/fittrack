import { SkeletonCard } from "@/components/SkeletonCard";

export default function Loading() {
  return (
    <div className="space-y-3">
      <SkeletonCard lines={2} />
      <SkeletonCard lines={3} />
      <SkeletonCard lines={3} />
    </div>
  );
}
