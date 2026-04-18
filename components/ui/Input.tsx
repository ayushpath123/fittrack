"use client";

import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  /** Dark glass fields for auth / onboarding-style screens */
  tone?: "default" | "glass";
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, icon, tone = "default", className, ...props }, ref) => {
  const isGlass = tone === "glass";
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          className={cn(
            "block text-sm font-medium",
            isGlass ? "text-[var(--muted)]" : "text-gray-700 dark:text-gray-300",
          )}
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div
            className={cn(
              "pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3",
              isGlass ? "text-white/40" : "text-gray-400 dark:text-gray-500",
            )}
          >
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full rounded-xl border px-4 py-3 text-sm transition-all duration-150",
            "disabled:cursor-not-allowed disabled:opacity-50",
            isGlass
              ? [
                  "border-white/12 bg-white/[0.06] text-white placeholder:text-white/35",
                  "focus:border-[#BEFF47]/35 focus:outline-none focus:ring-2 focus:ring-[#BEFF47]/20",
                ]
              : [
                  "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900",
                  "text-gray-900 placeholder:text-gray-400 dark:text-gray-100 dark:placeholder:text-gray-600",
                  "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400",
                ],
            error &&
              (isGlass
                ? "border-red-400/80 focus:ring-red-500/40"
                : "border-red-400 focus:ring-red-400 dark:border-red-500 dark:focus:ring-red-500"),
            icon && "pl-10",
            className,
          )}
          {...props}
        />
      </div>
      {error && (
        <p className={cn("mt-1 text-xs", isGlass ? "text-red-400" : "text-red-500 dark:text-red-400")}>{error}</p>
      )}
    </div>
  );
});

Input.displayName = "Input";
export { Input };
