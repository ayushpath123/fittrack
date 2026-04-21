"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { AuthCard, AuthDivider, AuthPageChrome } from "@/components/AuthChrome";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { GoogleIcon, LockIcon, MailIcon } from "@/components/icons";
import { SignupInput, signupSchema } from "@/lib/validations/auth";

function SignupFallback() {
  return (
    <AuthPageChrome>
      <div className="relative z-[1] w-full max-w-md">
        <p className="text-center text-sm text-zinc-400">Loading…</p>
      </div>
    </AuthPageChrome>
  );
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oauthCallbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const installUrl = `/install-app?next=${encodeURIComponent(oauthCallbackUrl)}`;
  const [oauthLoading, setOauthLoading] = useState<"google" | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupInput) => {
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          phone: data.phone,
          password: data.password,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || "Failed to create account.");
        return;
      }

      if (result.verifyUrl) {
        toast.success("Account created. Please verify your email.");
      } else {
        toast.success("Account created. Check your email for verification.");
      }
      router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  };

  const handleGoogle = async () => {
    setOauthLoading("google");
    try {
      await signIn("google", { callbackUrl: installUrl });
    } catch {
      toast.error("Failed to start Google sign-in. Try again.");
      setOauthLoading(null);
    }
  };

  return (
    <AuthPageChrome>
      <div className="relative z-[1] w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">Create your account</h1>
          <p className="mt-1.5 text-sm text-zinc-400">Start your tracking journey today.</p>
        </div>

        <AuthCard>
          <div className="mb-2 space-y-3">
            <Button
              variant="oauth"
              className="w-full border-white/10 bg-white/[0.06] text-white hover:bg-white/[0.1]"
              isLoading={oauthLoading === "google"}
              loadingText="Connecting..."
              disabled={!!oauthLoading || isSubmitting}
              onClick={() => void handleGoogle()}
              icon={<GoogleIcon className="h-4 w-4" />}
            >
              Continue with Google
            </Button>
          </div>

          <AuthDivider />

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Input
              tone="glass"
              label="Email address"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              error={errors.email?.message}
              icon={<MailIcon className="h-4 w-4" />}
              disabled={isSubmitting || !!oauthLoading}
              {...register("email")}
            />
            <Input
              tone="glass"
              label="Phone number (with country code)"
              type="tel"
              placeholder="+919876543210"
              autoComplete="tel"
              error={errors.phone?.message}
              disabled={isSubmitting || !!oauthLoading}
              {...register("phone")}
            />

            <Input
              tone="glass"
              label="Password"
              type="password"
              placeholder="Minimum 8 characters"
              autoComplete="new-password"
              error={errors.password?.message}
              icon={<LockIcon className="h-4 w-4" />}
              disabled={isSubmitting || !!oauthLoading}
              {...register("password")}
            />

            <Input
              tone="glass"
              label="Confirm password"
              type="password"
              placeholder="Repeat your password"
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              icon={<LockIcon className="h-4 w-4" />}
              disabled={isSubmitting || !!oauthLoading}
              {...register("confirmPassword")}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isSubmitting}
              loadingText="Creating account..."
              disabled={!!oauthLoading}
            >
              Create account
            </Button>
          </form>
        </AuthCard>

        <p className="mt-6 text-center text-sm text-zinc-400">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[#B8E86A] hover:text-[#BEFF47]">
            Sign in
          </Link>
        </p>
      </div>
    </AuthPageChrome>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupFallback />}>
      <SignupForm />
    </Suspense>
  );
}
