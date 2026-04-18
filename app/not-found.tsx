import Link from "next/link";
import { Home, LogIn } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-6xl font-black tabular-nums text-[#BEFF47]/90">404</p>
      <h1 className="text-2xl font-bold tracking-tight text-[var(--white)]">Page not found</h1>
      <p className="max-w-xs text-sm text-[var(--muted)]">
        That URL doesn&apos;t exist in FitTrack. Check the address or head back to your dashboard.
      </p>
      <div className="mt-2 flex w-full max-w-xs flex-col gap-2 sm:flex-row">
        <Link
          href="/dashboard"
          className="flex items-center justify-center gap-2 rounded-xl bg-[#BEFF47] py-3 text-sm font-semibold text-[#06080A] transition-transform hover:bg-[#CCFF5A] active:scale-95"
        >
          <Home size={18} />
          Dashboard
        </Link>
        <Link
          href="/login"
          className="flex items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] py-3 text-sm font-medium text-[var(--muted)] transition-colors hover:bg-white/[0.07] hover:text-[#B8E86A] active:scale-95"
        >
          <LogIn size={18} />
          Login
        </Link>
      </div>
    </div>
  );
}
