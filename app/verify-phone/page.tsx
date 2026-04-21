"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Loader2, ShieldCheck } from "lucide-react";

type BillingStatus = {
  phone?: string | null;
  phoneVerified?: boolean;
};
const INDIA_PREFIX = "+91";

function toLocalIndianDigits(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("91")) return digits.slice(2, 12);
  return digits.slice(0, 10);
}

export default function VerifyPhonePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = useMemo(() => searchParams.get("callbackUrl") || "/pricing", [searchParams]);

  const [phoneDigits, setPhoneDigits] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/billing/status", { credentials: "include" })
      .then(async (res) => {
        const data = (await res.json()) as BillingStatus;
        if (!res.ok) return;
        if (data.phoneVerified) {
          router.replace(callbackUrl);
          return;
        }
        setPhoneDigits(toLocalIndianDigits(data.phone ?? ""));
      })
      .finally(() => setLoading(false));
  }, [router, callbackUrl]);

  async function sendOtp() {
    if (phoneDigits.length !== 10) return;
    const phone = `${INDIA_PREFIX}${phoneDigits}`;
    setSending(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/settings/phone/verify/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Unable to send OTP.");
        return;
      }
      setMessage("OTP sent to your phone.");
    } catch {
      setError("Unable to send OTP.");
    } finally {
      setSending(false);
    }
  }

  async function verifyOtp() {
    if (otp.length !== 6 || phoneDigits.length !== 10) return;
    const phone = `${INDIA_PREFIX}${phoneDigits}`;
    setVerifying(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/settings/phone/verify/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone, otp }),
      });
      const data = (await res.json()) as { error?: string; verified?: boolean };
      if (!res.ok || !data.verified) {
        setError(data.error ?? "OTP verification failed.");
        return;
      }
      setMessage("Phone verified successfully.");
      const separator = callbackUrl.includes("?") ? "&" : "?";
      router.replace(`${callbackUrl}${separator}autostartCheckout=1`);
    } catch {
      setError("OTP verification failed.");
    } finally {
      setVerifying(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-[var(--muted)]">
        <Loader2 className="mr-2 animate-spin" size={16} />
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <Link href={callbackUrl} className="mb-4 inline-flex items-center gap-1 text-xs text-[var(--muted)] hover:text-white">
        <ChevronLeft size={14} />
        Back
      </Link>

      <div className="premium-card space-y-4 rounded-2xl p-5">
        <div className="inline-flex items-center gap-1 rounded-full border border-[rgba(190,255,71,.35)] bg-[rgba(190,255,71,.15)] px-2 py-1 text-[10px] font-semibold text-[#B8E86A]">
          <ShieldCheck size={12} />
          Phone verification required
        </div>

        <h1 className="text-xl font-bold text-[var(--white)]">Verify your phone number</h1>
        <p className="text-sm text-[var(--muted)]">Enter your number, verify OTP, and continue to checkout.</p>

        <div className="flex items-center rounded-xl border border-white/12 bg-white/[0.05]">
          <span className="px-3 text-sm font-medium text-[var(--muted)]">{INDIA_PREFIX}</span>
          <input
            type="tel"
            inputMode="numeric"
            value={phoneDigits}
            onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="9876543210"
            className="w-full bg-transparent px-3.5 py-2.5 text-sm text-[var(--white)] placeholder:text-[var(--hint)] focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={() => void sendOtp()}
          disabled={sending || phoneDigits.length !== 10}
          className="w-full rounded-xl border border-[#BEFF47]/35 bg-[#BEFF47]/10 px-3 py-2.5 text-sm font-semibold text-[#06080A] hover:bg-[#BEFF47]/18 dark:text-[#B8E86A] disabled:opacity-60"
        >
          {sending ? "Sending OTP…" : "Send OTP"}
        </button>

        <div className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="Enter 6-digit OTP"
            className="flex-1 rounded-xl border border-white/12 bg-white/[0.05] px-3.5 py-2.5 text-sm text-[var(--white)] placeholder:text-[var(--hint)] focus:border-[#BEFF47]/40 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void verifyOtp()}
            disabled={verifying || otp.length !== 6}
            className="rounded-xl bg-[#BEFF47] px-3 py-2.5 text-sm font-semibold text-[#06080A] hover:bg-[#CCFF5A] disabled:opacity-60"
          >
            {verifying ? "Verifying…" : "Verify"}
          </button>
        </div>

        {error ? <p className="text-xs text-[#FF5C7A]">{error}</p> : null}
        {message ? <p className="text-xs text-emerald-400">{message}</p> : null}
      </div>
    </div>
  );
}
