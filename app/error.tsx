"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 py-6 text-center">
      <h1 className="text-2xl font-bold tracking-tight text-[var(--white)]">Something went wrong</h1>
      <p className="max-w-xs text-sm text-[var(--muted)]">
        {error.message || "An unexpected error occurred. You can try again or go back home."}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-[#BEFF47] px-4 py-2.5 text-sm font-semibold text-[#06080A] transition-transform hover:bg-[#CCFF5A] active:scale-95"
        >
          Try again
        </button>
        <a
          href="/dashboard"
          className="rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-[var(--muted)] transition-colors hover:bg-white/[0.07] hover:text-[#B8E86A]"
        >
          Home
        </a>
      </div>
    </div>
  );
}
