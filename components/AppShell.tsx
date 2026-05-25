"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { MeshBackground } from "@/components/MeshBackground";
import { Sidebars } from "@/components/Sidebars";

/** Full-bleed routes: no app header, bottom nav, or page-screen wrapper */
const FULL_BLEED_ROUTES = new Set([
  "/",
  "/pricing",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/install-app",
  "/onboarding",
]);

function normalizePathname(path: string | null): string {
  if (!path || path === "/") return "/";
  return path.replace(/\/+$/, "") || "/";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFullBleed = FULL_BLEED_ROUTES.has(normalizePathname(pathname));

  if (isFullBleed) {
    return <main>{children}</main>;
  }

  return (
    <>
      <Sidebars />
      <div className="pointer-events-none fixed bottom-[var(--app-bottom-nav-h)] left-0 right-0 z-30 h-12 bg-gradient-to-t from-[#090b12] via-[#090b12]/85 to-transparent" />
      <main className="mx-auto max-w-md px-3.5 pb-[calc(var(--app-bottom-nav-h)+0.95rem)] pt-[calc(var(--app-header-h)+0.55rem)]">
        <div className="page-screen">
          <MeshBackground variant="fittrack" />
          <div className="relative z-[2]">{children}</div>
        </div>
      </main>
      <BottomNav />
    </>
  );
}
