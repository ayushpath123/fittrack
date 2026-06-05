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
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] transition-transform duration-200 group-hover:scale-105 group-active:scale-95"
        style={{ background: "var(--accent-grad)", boxShadow: "var(--shadow-accent)" }}
      >
        <Activity className="h-4 w-4 text-[#06080A]" strokeWidth={2.6} aria-hidden />
      </span>
      <span className={cn("text-[15px] font-bold tracking-tight text-white", wordmarkClassName)}>FitTrack</span>
    </Link>
  );
}
