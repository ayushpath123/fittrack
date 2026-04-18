"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { AuthCard, AuthPageChrome } from "@/components/AuthChrome";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validations/auth";

function ResetPasswordFallback() {
  return (
    <AuthPageChrome>
      <div className="relative z-[1] w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">Reset password</h1>
          <p className="mt-1.5 text-sm text-zinc-400">Choose a new password for your account.</p>
        </div>
        <AuthCard>
          <p className="text-center text-sm text-zinc-500">Loading…</p>
        </AuthCard>
      </div>
    </AuthPageChrome>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token },
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      toast.error(result.error || "Could not reset password.");
      return;
    }
    toast.success("Password updated. You can sign in now.");
    window.location.assign("/login");
  };

  return (
    <AuthPageChrome>
      <div className="relative z-[1] w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">Reset password</h1>
          <p className="mt-1.5 text-sm text-zinc-400">Choose a new password for your account.</p>
        </div>

        <AuthCard>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <input type="hidden" {...register("token")} />
            <Input tone="glass" label="New password" type="password" error={errors.password?.message} {...register("password")} />
            <Input
              tone="glass"
              label="Confirm password"
              type="password"
              error={errors.confirmPassword?.message}
              {...register("confirmPassword")}
            />
            <Button type="submit" className="w-full" isLoading={isSubmitting} loadingText="Saving...">
              Save new password
            </Button>
          </form>
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
