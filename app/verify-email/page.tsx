"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { AuthCard, AuthPageChrome } from "@/components/AuthChrome";

type VerifyState = "idle" | "loading" | "success" | "error";

function VerifyEmailFallback() {
  return (
    <AuthPageChrome>
      <div className="relative z-[1] w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">Verify your email</h1>
          <p className="mt-1.5 text-sm text-zinc-400">Loading…</p>
        </div>
        <AuthCard>
          <p className="text-center text-sm text-zinc-500">Loading…</p>
        </AuthCard>
      </div>
    </AuthPageChrome>
  );
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const [state, setState] = useState<VerifyState>(token ? "loading" : "idle");
  const [devVerifyUrl, setDevVerifyUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Invalid token");
        setState("success");
        toast.success("Email verified. You can sign in now.");
      })
      .catch((e: unknown) => {
        setState("error");
        toast.error(e instanceof Error ? e.message : "Verification failed");
      });
  }, [token]);

  async function resendVerification() {
    if (!email) return;
    const res = await fetch("/api/auth/verification/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const result = await res.json();
    if (!res.ok) {
      toast.error(result.error || "Could not resend verification.");
      return;
    }
    setDevVerifyUrl(result.verifyUrl ?? null);
    toast.success("Verification link regenerated.");
  }

  return (
    <AuthPageChrome>
      <div className="relative z-[1] w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">Verify your email</h1>
          <p className="mt-1.5 text-sm text-zinc-400">
            {token
              ? state === "loading"
                ? "Verifying your link..."
                : state === "success"
                  ? "Your email is verified."
                  : "This link is invalid or expired."
              : "Check your inbox for a verification link."}
          </p>
        </div>

        <AuthCard className="space-y-4">
          {token && state === "loading" ? (
            <p className="text-center text-sm text-zinc-400">Confirming your link…</p>
          ) : null}
          {token && state === "success" ? (
            <p className="text-center text-sm text-[#B8E86A]">You&apos;re all set — you can sign in.</p>
          ) : null}
          {token && state === "error" ? (
            <p className="text-center text-sm text-red-400">This link is invalid or has expired.</p>
          ) : null}
          {email ? (
            <button
              type="button"
              onClick={resendVerification}
              className="w-full rounded-xl border border-[#BEFF47]/30 bg-[#BEFF47]/10 py-2.5 text-sm font-medium text-[#B8E86A] transition-colors hover:bg-[#BEFF47]/16"
            >
              Resend verification link
            </button>
          ) : null}
          {devVerifyUrl ? (
            <p className="mt-3 break-all text-xs text-[#B8E86A]">
              Dev verification URL: <a href={devVerifyUrl}>{devVerifyUrl}</a>
            </p>
          ) : null}
          <p className="mt-4 text-sm text-zinc-400">
            Back to{" "}
            <Link href="/login" className="font-medium text-[#B8E86A] hover:text-[#BEFF47]">
              login
            </Link>
          </p>
        </AuthCard>
      </div>
    </AuthPageChrome>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailFallback />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
