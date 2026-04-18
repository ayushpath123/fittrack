import Link from "next/link";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

/** Wordmark + icon — matches the home page navbar (body font, not display). */
export function AppBrand({
  href = "/",
  className,
  wordmarkClassName,
  "aria-label": ariaLabel = "FitTrack home",
}: {
  href?: string;
  className?: string;
  wordmarkClassName?: string;
  "aria-label"?: string;
}) {
  return (
    <Link href={href} className={cn("group flex items-center gap-2", className)} aria-label={ariaLabel}>
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#BEFF47]">
        <Activity className="h-3.5 w-3.5 text-[#06080A]" aria-hidden />
      </span>
      <span className={cn("text-sm font-bold tracking-tight text-white", wordmarkClassName)}>FitTrack</span>
    </Link>
  );
}
