"use client";

import { useReducer, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

import { AppBrand } from "@/components/AppBrand";
import ProgressBar from "./ProgressBar";
import QuickSetupStep from "./steps/QuickSetupStep";
import FirstLogStep from "./steps/FirstLogStep";
import type { Goal, MacroResults } from "./types";
import { calculateMacros } from "@/lib/onboarding-macros";

export type { Goal, MacroResults } from "./types";

interface State {
  step: number;
  direction: number;
  weight: number;
  height: number;
  goal: Goal;
  results: MacroResults | null;
}

type Action =
  | { type: "GO_TO"; step: number }
  | { type: "SET_WEIGHT"; value: number }
  | { type: "SET_HEIGHT"; value: number }
  | { type: "SET_GOAL"; goal: Goal }
  | { type: "SET_RESULTS"; results: MacroResults | null };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "GO_TO":
      return {
        ...state,
        direction: action.step > state.step ? 1 : -1,
        step: action.step,
      };
    case "SET_WEIGHT":
      return { ...state, weight: action.value };
    case "SET_HEIGHT":
      return { ...state, height: action.value };
    case "SET_GOAL":
      return { ...state, goal: action.goal };
    case "SET_RESULTS":
      return { ...state, results: action.results };
    default:
      return state;
  }
}

const PROGRESS_MAP: Record<number, number> = { 0: 12, 1: 100 };

export default function OnboardingFlow() {
  const router = useRouter();
  const { status } = useSession();
  const [bootstrapping, setBootstrapping] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [state, dispatch] = useReducer(reducer, {
    step: 0,
    direction: 1,
    weight: 70,
    height: 170,
    goal: "maintain",
    results: null,
  });

  const goTo = useCallback((step: number) => dispatch({ type: "GO_TO", step }), []);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      router.replace(`/login?callbackUrl=${encodeURIComponent("/onboarding")}`);
      return;
    }

    if (status !== "authenticated") return;

    let cancelled = false;

    (async () => {
      try {
        const statusRes = await fetch("/api/auth/onboarding-status", { credentials: "include" });
        if (statusRes.status === 401) {
          router.replace(`/login?callbackUrl=${encodeURIComponent("/onboarding")}`);
          return;
        }
        if (statusRes.ok) {
          const onboarding = (await statusRes.json()) as { needsOnboarding: boolean };
          if (!onboarding.needsOnboarding) {
            router.replace("/dashboard");
            return;
          }
        }
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, router]);

  const handleFinish = useCallback(async () => {
    const computed = calculateMacros(state.weight, state.height, state.goal);
    setIsSaving(true);

    try {
      const res = await fetch("/api/settings/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...computed,
          reminderEnabled: false,
          reminderTime: "09:00",
        }),
      });
      if (res.status === 401) {
        router.replace(`/login?callbackUrl=${encodeURIComponent("/onboarding")}`);
        return;
      }
      if (!res.ok) {
        let msg = "Could not save your plan. Please try again.";
        try {
          const err = (await res.json()) as { error?: string };
          if (err.error) msg = err.error;
        } catch {
          /* ignore */
        }
        toast.error(msg);
        return;
      }

      dispatch({ type: "SET_RESULTS", results: computed });
      toast.success(`${computed.calorieTarget} kcal/day — tap to log your first meal`, { duration: 3500 });
      goTo(1);
    } catch {
      toast.error("Network error — could not save your plan. Try again.");
    } finally {
      setIsSaving(false);
    }
  }, [state.weight, state.height, state.goal, goTo, router]);

  const handleFirstLogDone = useCallback(() => {
    window.location.assign("/dashboard?welcome=1");
  }, []);

  const { step, direction, weight, height, goal, results } = state;

  if (status === "loading" || bootstrapping) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#08090F] px-5 py-10">
        <div className="pointer-events-none absolute -left-48 -top-48 h-96 w-96 rounded-full bg-[#BEFF47] opacity-[0.055] blur-[100px]" />
        <AppBrand href="/" className="relative mb-8" />
        <p className="relative text-sm text-white/40">Loading…</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#08090F] px-5 py-10">
      <div className="pointer-events-none absolute -left-48 -top-48 h-96 w-96 rounded-full bg-[#BEFF47] opacity-[0.055] blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-48 -right-48 h-80 w-80 rounded-full bg-[#4A7EFF] opacity-[0.07] blur-[90px]" />

      <div className="relative z-[1] mb-8 flex w-full justify-center">
        <AppBrand href="/" />
      </div>

      <div className="relative z-[1] w-full max-w-[440px] overflow-hidden rounded-[26px] border border-white/[0.08] bg-white/[0.032] backdrop-blur-xl">
        <ProgressBar progress={PROGRESS_MAP[step] ?? 0} />

        <div className="px-9 pb-9 pt-6">
          <AnimatePresence mode="wait" custom={direction}>
            {step === 0 && (
              <QuickSetupStep
                key="quicksetup"
                direction={direction}
                goal={goal}
                weight={weight}
                height={height}
                isSaving={isSaving}
                onGoalChange={(g) => dispatch({ type: "SET_GOAL", goal: g })}
                onWeightChange={(v) => dispatch({ type: "SET_WEIGHT", value: v })}
                onHeightChange={(v) => dispatch({ type: "SET_HEIGHT", value: v })}
                onFinish={() => void handleFinish()}
              />
            )}
            {step === 1 && results && (
              <FirstLogStep key="firstlog" direction={direction} results={results} onDone={handleFirstLogDone} />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
