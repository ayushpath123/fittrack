"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "oauth";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      loadingText,
      icon,
      children,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const base =
      "inline-flex items-center justify-center gap-2.5 font-medium rounded-xl transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#BEFF47]/50 focus-visible:ring-offset-[#08090f] disabled:cursor-not-allowed select-none";

    const variants = {
      primary:
        "bg-[#BEFF47] hover:bg-[#CCFF5A] active:bg-[#b8f038] text-[#06080A] disabled:opacity-50 shadow-[0_4px_24px_rgba(190,255,71,.2)]",
      secondary:
        "bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700 dark:active:bg-gray-600 dark:text-gray-100 disabled:opacity-50",
      ghost:
        "text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800 disabled:opacity-40",
      oauth:
        "bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-900 dark:hover:bg-gray-800 dark:active:bg-gray-700 dark:text-gray-100 dark:border-gray-700 disabled:opacity-50 shadow-sm",
    };

    const sizes = {
      sm: "px-3 py-2 text-xs",
      md: "px-4 py-3 text-sm",
      lg: "px-6 py-3.5 text-base",
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <svg className="h-4 w-4 shrink-0 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {loadingText || "Loading..."}
          </>
        ) : (
          <>
            {icon && <span className="shrink-0">{icon}</span>}
            {children}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
export { Button };
