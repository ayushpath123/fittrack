import { AppBrand } from "@/components/AppBrand";
import { cn } from "@/lib/utils";

/** Same ambient shell as onboarding: #08090F + lime / blue orbs */
export function AuthPageChrome({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#08090F] px-4 py-10",
        className,
      )}
    >
      <div className="pointer-events-none absolute -left-48 -top-48 h-96 w-96 rounded-full bg-[#BEFF47] opacity-[0.055] blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-48 -right-48 h-80 w-80 rounded-full bg-[#4A7EFF] opacity-[0.07] blur-[90px]" />
      <div className="relative z-[1] flex w-full flex-col items-center">
        <div className="mb-6 flex w-full justify-center sm:mb-8">
          <AppBrand href="/" />
        </div>
        {children}
      </div>
    </div>
  );
}

export function AuthCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[26px] border border-white/[0.08] bg-white/[0.032] p-6 shadow-[0_8px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-8",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AuthDivider({ label = "or" }: { label?: string }) {
  return (
    <div className="my-6 flex items-center gap-3">
      <div className="h-px flex-1 bg-white/10" />
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{label}</span>
      <div className="h-px flex-1 bg-white/10" />
    </div>
  );
}
