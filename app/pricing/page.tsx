"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronLeft, Loader2, Sparkles } from "lucide-react";
import { AppBrand } from "@/components/AppBrand";

type RazorpayCheckoutOptions = {
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  image: string;
  prefill: { name: string; email: string; contact?: string };
  notes: Record<string, string>;
  theme: { color: string };
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export default function PricingPage() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasPro, setHasPro] = useState<boolean | null>(null);
  const [phoneVerified, setPhoneVerified] = useState<boolean | null>(null);
  const autoStartedRef = useRef(false);
  const verifyRedirectedRef = useRef(false);

  useEffect(() => {
    void fetch("/api/billing/status", { credentials: "include" })
      .then(async (r) => {
        const d = (await r.json()) as { hasPro?: boolean; phoneVerified?: boolean };
        if (!r.ok) {
          setHasPro(false);
          setPhoneVerified(false);
          return;
        }
        setHasPro(!!d.hasPro);
        setPhoneVerified(!!d.phoneVerified);
      })
      .catch(() => {
        setHasPro(false);
        setPhoneVerified(false);
      });
  }, []);

  useEffect(() => {
    if (verifyRedirectedRef.current) return;
    if (status !== "authenticated") return;
    if (hasPro !== false) return;
    if (phoneVerified !== false) return;
    verifyRedirectedRef.current = true;
    router.replace("/verify-phone?callbackUrl=/pricing");
  }, [status, hasPro, phoneVerified, router]);

  useEffect(() => {
    if (autoStartedRef.current) return;
    const shouldAutoStart = searchParams.get("autostartCheckout") === "1";
    if (!shouldAutoStart) return;
    if (status !== "authenticated") return;
    if (hasPro !== false) return;
    autoStartedRef.current = true;
    router.replace("/pricing", { scroll: false });
    void checkout();
  }, [searchParams, status, hasPro, router]);

  async function ensureRazorpayScript(): Promise<boolean> {
    if (window.Razorpay) return true;
    return await new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  async function checkout() {
    if (status === "unauthenticated") {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST", credentials: "include" });
      const data = (await res.json()) as { checkout?: RazorpayCheckoutOptions; error?: string; code?: string; settingsUrl?: string };
      if (res.status === 401) {
        setError("Session expired — sign in again to upgrade.");
        return;
      }
      if (res.status === 400 && (data.code === "PHONE_REQUIRED" || data.code === "PHONE_UNVERIFIED")) {
        router.push(data.settingsUrl ?? "/verify-phone?callbackUrl=/pricing");
        return;
      }
      if (!res.ok || !data.checkout) {
        setError(data.error ?? "Checkout unavailable. Set RAZORPAY keys and plan ID.");
        return;
      }
      const scriptReady = await ensureRazorpayScript();
      if (!scriptReady || !window.Razorpay) {
        setError("Could not load Razorpay checkout.");
        return;
      }
      const rzp = new window.Razorpay({
        ...data.checkout,
        handler: async (response: {
          razorpay_payment_id?: string;
          razorpay_subscription_id?: string;
          razorpay_signature?: string;
        }) => {
          const verifyRes = await fetch("/api/billing/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(response),
          });
          if (!verifyRes.ok) {
            setError("Payment completed, but verification failed. Contact support.");
            return;
          }
          window.location.href = "/settings?billing=success#subscription";
        },
      });
      rzp.open();
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  const guest = status === "unauthenticated";
  const signedIn = status === "authenticated";

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#08090F] text-[var(--white)]">
      <div className="pointer-events-none absolute -left-48 -top-48 h-96 w-96 rounded-full bg-[#BEFF47] opacity-[0.055] blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-48 -right-48 h-80 w-80 rounded-full bg-[#4A7EFF] opacity-[0.07] blur-[90px]" />

      <header className="relative z-10 border-b border-white/[0.08] bg-[#08090F]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5">
          <AppBrand href="/" />
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1 rounded-xl border border-[rgba(255,255,255,.1)] px-2.5 py-1.5 text-xs text-white/55 transition-colors hover:text-white/90"
            >
              <ChevronLeft size={13} />
              Home
            </Link>
            {guest ? (
              <>
                <Link href="/login" className="rounded-xl px-3 py-2 text-xs font-medium text-white/75 hover:text-white">
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-xl bg-[#BEFF47] px-3.5 py-2 text-xs font-semibold text-[#06080A] hover:bg-[#CCFF5A]"
                >
                  Get started
                </Link>
              </>
            ) : null}
          </nav>
        </div>
      </header>

      <main className="relative z-[1] mx-auto max-w-lg px-4 pb-16 pt-10">
        <div className="premium-card rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 sm:p-6">
          <div className="mb-2 inline-flex items-center gap-1 rounded-full border border-[rgba(190,255,71,.35)] bg-[rgba(190,255,71,.15)] px-2 py-1 text-[10px] font-semibold text-[#B8E86A]">
            <Sparkles size={11} />
            Healthify Pro
          </div>
          <h1 className="num text-2xl font-bold text-[var(--white)]">Unlock AI features</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Pro covers AI usage (Gemini) for meal photo estimates and the agentic coach—tied to your account only.
          </p>

          <ul className="mt-4 space-y-2 text-sm text-[var(--white)]">
            {["AI meal photo estimates", "Agentic AI coach with tool calling", "Fair-use limits to protect your account"].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <Check size={16} className="mt-0.5 shrink-0 text-[#2DD4A0]" />
                {t}
              </li>
            ))}
          </ul>

          {signedIn && hasPro ? (
            <p className="mt-4 rounded-xl border border-[rgba(45,212,160,.35)] bg-[rgba(45,212,160,.1)] px-3 py-2 text-sm text-[#86EFAC]">
              You already have Pro. Manage billing under Settings → Subscription.
            </p>
          ) : null}

          {guest ? (
            <div className="mt-6 space-y-3">
              <p className="text-sm text-white/45">Create an account or sign in to subscribe with Razorpay.</p>
              <Link
                href="/login?callbackUrl=/pricing"
                className="flex w-full items-center justify-center rounded-xl bg-[linear-gradient(135deg,#BEFF47,#7E73F6)] py-3 text-sm font-semibold text-white"
              >
                Log in to upgrade
              </Link>
              <Link
                href="/signup?callbackUrl=/pricing"
                className="flex w-full items-center justify-center rounded-xl border border-white/14 py-3 text-sm font-semibold text-white/90 hover:bg-white/[0.05]"
              >
                Create account
              </Link>
            </div>
          ) : (
            <>
              <button
                type="button"
                disabled={loading || hasPro === true || status === "loading"}
                onClick={() => void checkout()}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#BEFF47,#7E73F6)] py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                {loading ? "Opening checkout…" : hasPro ? "Current plan" : "Upgrade with Razorpay"}
              </button>

              {error ? (
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-[#FF5C7A]">{error}</p>
                </div>
              ) : null}
            </>
          )}
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/[0.08] py-6 text-center text-[11px] text-white/30">
        <p>© {new Date().getFullYear()} FitTrack</p>
      </footer>
    </div>
  );
}
