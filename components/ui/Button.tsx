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
      "inline-flex items-center justify-center gap-2.5 font-semibold rounded-xl transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#BEFF47]/50 focus-visible:ring-offset-[#06070c] disabled:cursor-not-allowed active:scale-[0.985] select-none";

    const variants = {
      primary:
        "btn-accent disabled:opacity-50 disabled:shadow-none",
      secondary:
        "bg-white/[0.06] hover:bg-white/[0.1] active:bg-white/[0.14] text-white border border-white/10 hover:border-white/20 disabled:opacity-50",
      ghost:
        "text-[var(--muted)] hover:text-white hover:bg-white/[0.06] disabled:opacity-40",
      oauth:
        "bg-white/[0.05] hover:bg-white/[0.09] active:bg-white/[0.12] text-white border border-white/10 hover:border-white/20 disabled:opacity-50",
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
