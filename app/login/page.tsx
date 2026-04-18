"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { AuthCard, AuthPageChrome } from "@/components/AuthChrome";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { GoogleIcon, LockIcon, MailIcon, PhoneIcon } from "@/components/icons";
import { LoginInput, PhoneLoginInput, loginSchema, phoneLoginSchema } from "@/lib/validations/auth";

type Step = "pick" | "phone" | "email";
type PhoneState = "idle" | "sending" | "otp_sent" | "verifying";

function LoginFallback() {
  return (
    <AuthPageChrome>
      <div className="relative z-[1] w-full max-w-[400px]">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">Welcome back</h1>
          <p className="mb-8 mt-1.5 text-sm text-zinc-400">Loading…</p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
          <p className="text-center text-sm text-zinc-500">Loading…</p>
        </div>
      </div>
    </AuthPageChrome>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [step, setStep] = useState<Step>("pick");
  const [prevStep, setPrevStep] = useState<Step>("pick");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [phoneState, setPhoneState] = useState<PhoneState>("idle");
  const [phoneCooldown, setPhoneCooldown] = useState(0);
  const [phoneLockedValue, setPhoneLockedValue] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [showPassword, setShowPassword] = useState(false);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "demo@fittrack.app",
      password: "password123",
    },
  });

  const {
    register: registerPhone,
    formState: { errors: phoneErrors },
    getValues: getPhoneValues,
    setValue: setPhoneFormValue,
  } = useForm<PhoneLoginInput>({
    resolver: zodResolver(phoneLoginSchema),
    defaultValues: { phone: "", otp: "" },
  });

  const onEmailSubmit = async (data: LoginInput) => {
    const res = await signIn("credentials", {
      email: data.email.trim().toLowerCase(),
      password: data.password,
      redirect: false,
    });

    if (!res || res.error) {
      toast.error("Invalid email or password. Please try again.");
      return;
    }

    const statusRes = await fetch("/api/auth/onboarding-status", { credentials: "include" });
    if (statusRes.ok) {
      const status = (await statusRes.json()) as { needsOnboarding: boolean; emailVerified: boolean };
      if (!status.emailVerified) {
        await signOut({ redirect: false });
        router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
        return;
      }
      if (status.needsOnboarding) {
        toast.success("Let’s finish your setup.");
        router.push("/onboarding");
        router.refresh();
        return;
      }
    }

    toast.success("Welcome back!");
    router.push(callbackUrl);
    router.refresh();
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await signIn("google", { callbackUrl });
    } catch {
      toast.error("Failed to sign in with google. Try again.");
      setGoogleLoading(false);
    }
  };

  const sendOtp = async () => {
    if (phoneCooldown > 0 || phoneState === "sending") return;
    const phone = getPhoneValues("phone");
    if (!phone) {
      setPhoneError("Phone is required.");
      return;
    }

    setPhoneError("");
    setOtpError("");
    setPhoneState("sending");
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, purpose: "login" }),
      });
      const result = (await res.json()) as { error?: string; retryAfterSeconds?: number };
      if (!res.ok) {
        if (result.retryAfterSeconds) setPhoneCooldown(result.retryAfterSeconds);
        setPhoneError(result.error || "Could not send OTP.");
        setPhoneState("idle");
        return;
      }

      setPhoneState("otp_sent");
      setPhoneLockedValue(phone);
      setPhoneCooldown(60);
      setOtpDigits(["", "", "", "", "", ""]);
      setPhoneFormValue("otp", "");
      window.setTimeout(() => otpRefs.current[0]?.focus(), 30);
    } catch {
      setPhoneError("Could not send OTP.");
      setPhoneState("idle");
    }
  };

  const onPhoneSubmit = async () => {
    if (otpDigits.some((digit) => digit === "")) {
      setOtpError("Enter the full 6-digit code.");
      return;
    }

    setOtpError("");
    setPhoneState("verifying");
    const otp = otpDigits.join("");
    setPhoneFormValue("otp", otp);
    const phone = getPhoneValues("phone");
    const parsed = phoneLoginSchema.safeParse({ phone, otp });
    if (!parsed.success) {
      setOtpError("Invalid phone or OTP.");
      setPhoneState("otp_sent");
      return;
    }
    const res = await signIn("phone-otp", {
      phone: parsed.data.phone,
      otp: parsed.data.otp,
      redirect: false,
    });
    if (!res || res.error) {
      setOtpError("Invalid phone or OTP.");
      setPhoneState("otp_sent");
      return;
    }

    const statusRes = await fetch("/api/auth/onboarding-status", { credentials: "include" });
    if (statusRes.ok) {
      const status = (await statusRes.json()) as { needsOnboarding: boolean };
      if (status.needsOnboarding) {
        toast.success("Let’s finish your setup.");
        router.push("/onboarding");
        router.refresh();
        return;
      }
    }

    toast.success("Signed in with SMS OTP.");
    router.push("/dashboard");
    router.refresh();
  };

  const setStepWithDirection = (next: Step) => {
    setPrevStep(step);
    setStep(next);
  };

  const onBack = () => {
    setStepWithDirection("pick");
    setPhoneState("idle");
    setPhoneError("");
    setOtpError("");
    setPhoneCooldown(0);
    setOtpDigits(["", "", "", "", "", ""]);
  };

  useEffect(() => {
    if (phoneCooldown <= 0) return;
    const id = window.setInterval(() => {
      setPhoneCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [phoneCooldown]);

  const direction = useMemo(() => {
    if (step === "pick") return -1;
    if (prevStep === "pick") return 1;
    return 1;
  }, [prevStep, step]);

  const otpValue = otpDigits.join("");

  const updateOtpDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(0, 1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);
    setOtpError("");
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const onOtpKeyDown = (index: number, key: string) => {
    if (key === "Backspace" && !otpDigits[index] && index > 0) otpRefs.current[index - 1]?.focus();
  };

  const onOtpPaste = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 6).split("");
    if (!digits.length) return;
    const next = ["", "", "", "", "", ""];
    digits.forEach((digit, i) => {
      next[i] = digit;
    });
    setOtpDigits(next);
    if (digits.length < 6) otpRefs.current[digits.length]?.focus();
    else otpRefs.current[5]?.focus();
  };

  const cardMotion = {
    initial: { opacity: 0, x: 16 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.2 } },
    exit: { opacity: 0, x: -16, transition: { duration: 0.2 } },
  };

  return (
    <AuthPageChrome>
      <div className="relative z-[1] w-full max-w-[400px]">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">Welcome back</h1>
          <p className="mb-8 mt-1.5 text-sm text-zinc-400">Pick any sign-in method to continue</p>
        </div>

        <AnimatePresence mode="wait" custom={direction}>
          {step === "pick" && (
            <motion.div key="pick" initial={cardMotion.initial} animate={cardMotion.animate} exit={cardMotion.exit}>
              <AuthCard>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={googleLoading}
                  className="flex h-14 w-full items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.04] px-4 transition-all duration-150 hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <span className="flex items-center gap-3 text-sm font-medium text-white">
                    <GoogleIcon className="h-4 w-4" />
                    Continue with Google
                  </span>
                  {googleLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-transparent" /> : <span className="text-zinc-600">→</span>}
                </button>
                <button
                  type="button"
                  onClick={() => setStepWithDirection("phone")}
                  className="flex h-14 w-full items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.04] px-4 transition-all duration-150 hover:bg-white/[0.07]"
                >
                  <span className="flex items-center gap-3 text-sm font-medium text-white">
                    <PhoneIcon className="h-4 w-4 text-zinc-300" />
                    Continue with Phone
                  </span>
                  <span className="text-zinc-600">→</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStepWithDirection("email")}
                  className="flex h-14 w-full items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.04] px-4 transition-all duration-150 hover:bg-white/[0.07]"
                >
                  <span className="flex items-center gap-3 text-sm font-medium text-white">
                    <MailIcon className="h-4 w-4 text-zinc-300" />
                    Continue with Email
                  </span>
                  <span className="text-zinc-600">→</span>
                </button>
              </div>
              </AuthCard>
            </motion.div>
          )}

          {step === "phone" && (
            <motion.div key="phone" initial={cardMotion.initial} animate={cardMotion.animate} exit={cardMotion.exit}>
              <AuthCard>
              <button type="button" onClick={onBack} className="mb-5 text-xs text-zinc-500 hover:text-zinc-300">
                ← Back
              </button>
              <h2 className="text-lg font-semibold text-white">Enter your phone number</h2>
              <p className="mt-1 text-sm text-zinc-400">We&apos;ll send a 6-digit code via SMS</p>

              <div className="mt-5 space-y-4">
                <div>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    readOnly={phoneState === "otp_sent" || phoneState === "verifying"}
                    className="h-12 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 text-white placeholder:text-zinc-500 focus:border-transparent focus:outline-none focus:ring-1 focus:ring-[#BEFF47]/50"
                    {...registerPhone("phone")}
                  />
                  {(phoneState === "otp_sent" || phoneState === "verifying") && (
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-emerald-400">✓ Number locked</span>
                      <button
                        type="button"
                        className="text-xs text-zinc-400 hover:text-zinc-300"
                        onClick={() => {
                          setPhoneState("idle");
                          setPhoneCooldown(0);
                          setOtpDigits(["", "", "", "", "", ""]);
                          setPhoneFormValue("phone", phoneLockedValue);
                        }}
                      >
                        Change
                      </button>
                    </div>
                  )}
                  {(phoneError || phoneErrors.phone?.message) && (
                    <p className="mt-2 text-xs text-red-400">{phoneError || phoneErrors.phone?.message}</p>
                  )}
                </div>

                {(phoneState === "idle" || phoneState === "sending") && (
                  <Button type="button" className="h-12 w-full bg-[#BEFF47] text-[#06080A] hover:bg-[#CCFF5A]" isLoading={phoneState === "sending"} loadingText="Sending..." onClick={sendOtp}>
                    Send OTP
                  </Button>
                )}

                {(phoneState === "otp_sent" || phoneState === "verifying") && (
                  <div>
                    <div className="flex justify-center gap-2">
                      {otpDigits.map((digit, index) => (
                        <input
                          key={index}
                          ref={(el) => {
                            otpRefs.current[index] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => updateOtpDigit(index, e.target.value)}
                          onKeyDown={(e) => onOtpKeyDown(index, e.key)}
                          onPaste={(e) => {
                            e.preventDefault();
                            onOtpPaste(e.clipboardData.getData("text"));
                          }}
                          className="h-12 w-10 rounded-xl border border-white/[0.08] bg-white/[0.04] text-center text-lg font-semibold text-white focus:border-transparent focus:outline-none focus:ring-1 focus:ring-[#BEFF47]/50"
                        />
                      ))}
                    </div>
                    <div className="mt-2 text-center text-xs text-zinc-400">
                      {phoneCooldown > 0 ? (
                        <>Resend in 0:{String(phoneCooldown).padStart(2, "0")}</>
                      ) : (
                        <button type="button" onClick={sendOtp} className="text-[#B8E86A] hover:text-[#BEFF47]">
                          Resend OTP
                        </button>
                      )}
                    </div>
                    {(otpError || phoneErrors.otp?.message) && (
                      <p className="mt-2 text-xs text-red-400">{otpError || phoneErrors.otp?.message}</p>
                    )}
                    <Button
                      type="button"
                      className="mt-4 h-12 w-full bg-[#BEFF47] text-[#06080A] hover:bg-[#CCFF5A]"
                      isLoading={phoneState === "verifying"}
                      loadingText="Signing in..."
                      disabled={otpValue.length !== 6 || phoneState === "verifying"}
                      onClick={onPhoneSubmit}
                    >
                      Sign in
                    </Button>
                  </div>
                )}
              </div>
              </AuthCard>
            </motion.div>
          )}

          {step === "email" && (
            <motion.div key="email" initial={cardMotion.initial} animate={cardMotion.animate} exit={cardMotion.exit}>
              <AuthCard>
              <button type="button" onClick={() => setStepWithDirection("pick")} className="mb-5 text-xs text-zinc-500 hover:text-zinc-300">
                ← Back
              </button>
              <h2 className="text-lg font-semibold text-white">Sign in with email</h2>
              <p className="mt-1 text-sm text-zinc-400">Enter your credentials below</p>

              <form onSubmit={handleSubmit(onEmailSubmit)} className="mt-5 space-y-4" noValidate>
                <Input
                  tone="glass"
                  label="Email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  error={errors.email?.message}
                  icon={<MailIcon className="h-4 w-4" />}
                  disabled={isSubmitting}
                  {...register("email")}
                />
                <div className="relative">
                  <Input
                    tone="glass"
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    error={errors.password?.message}
                    icon={<LockIcon className="h-4 w-4" />}
                    disabled={isSubmitting}
                    className="pr-11"
                    {...register("password")}
                  />
                  <button type="button" className="absolute right-3 top-[38px] text-xs text-zinc-400 hover:text-zinc-200" onClick={() => setShowPassword((v) => !v)}>
                    👁
                  </button>
                </div>
                <div className="flex justify-end">
                  <Link href="/forgot-password" className="text-xs text-[#B8E86A] hover:text-[#BEFF47]">
                    Forgot password?
                  </Link>
                </div>
                <Button type="submit" size="lg" className="h-12 w-full bg-[#BEFF47] text-[#06080A] hover:bg-[#CCFF5A]" isLoading={isSubmitting} loadingText="Signing in...">
                  Sign in
                </Button>
              </form>
              </AuthCard>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="mt-5 text-center text-sm text-zinc-400">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-semibold text-[#B8E86A] hover:text-[#BEFF47]">
            Sign up →
          </Link>
        </p>
      </div>
    </AuthPageChrome>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
