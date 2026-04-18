"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { AuthCard, AuthPageChrome } from "@/components/AuthChrome";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validations/auth";

export default function ForgotPasswordPage() {
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      toast.error(result.error || "Could not create reset link");
      return;
    }
    setDevResetUrl(result.resetUrl ?? null);
    toast.success("If the account exists, reset instructions are ready.");
  };

  return (
    <AuthPageChrome>
      <div className="relative z-[1] w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">Forgot password</h1>
          <p className="mt-1.5 text-sm text-zinc-400">Enter your email and we will generate a reset link.</p>
        </div>

        <AuthCard>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <Input tone="glass" label="Email" type="email" error={errors.email?.message} {...register("email")} />
            <Button type="submit" className="w-full" isLoading={isSubmitting} loadingText="Generating...">
              Generate reset link
            </Button>
          </form>
          {devResetUrl ? (
            <p className="mt-3 break-all text-xs text-[#B8E86A]">
              Dev reset URL: <a href={devResetUrl}>{devResetUrl}</a>
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
