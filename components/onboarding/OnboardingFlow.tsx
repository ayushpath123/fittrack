"use client";

import { useReducer, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

import { AppBrand } from "@/components/AppBrand";
import ProgressBar from "./ProgressBar";
import WelcomeStep from "./steps/WelcomeStep";
import WeightStep from "./steps/WeightStep";
import HeightStep from "./steps/HeightStep";
import GoalStep from "./steps/GoalStep";
import ProcessingStep from "./steps/ProcessingStep";
import type { Goal, MacroResults } from "./types";

export type { Goal, MacroResults } from "./types";

interface State {
  step: number;
  direction: number;
  weight: number;
  height: number;
  goal: Goal | null;
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

function calculateMacros(weight: number, height: number, goal: Goal): MacroResults {
  const bmr = 10 * weight + 6.25 * height - 5 * 25 + 5;
  let calories = Math.round(bmr * 1.55);

  if (goal === "lose") calories -= 400;
  else if (goal === "gain") calories += 300;

  const proteinTarget = Math.round(weight * 1.9);
  const fatTarget = Math.round((calories * 0.225) / 9);
  let carbTarget = Math.round((calories - proteinTarget * 4 - fatTarget * 9) / 4);
  carbTarget = Math.max(50, carbTarget);
  let waterTargetMl = Math.round(weight * 35);
  waterTargetMl = Math.min(20000, Math.max(500, waterTargetMl));

  return {
    calorieTarget: Math.max(800, calories),
    proteinTarget: Math.max(30, proteinTarget),
    carbTarget,
    fatTarget: Math.max(20, fatTarget),
    waterTargetMl,
  };
}

const PROGRESS_MAP: Record<number, number> = { 0: 0, 1: 28, 2: 56, 3: 82, 4: 100 };

export default function OnboardingFlow() {
  const router = useRouter();
  const { status } = useSession();
  const [bootstrapping, setBootstrapping] = useState(true);

  const [state, dispatch] = useReducer(reducer, {
    step: 0,
    direction: 1,
    weight: 72,
    height: 175,
    goal: null,
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
    if (!state.goal) return;

    const computed = calculateMacros(state.weight, state.height, state.goal);
    goTo(4);
    dispatch({ type: "SET_RESULTS", results: null });

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
        goTo(3);
        return;
      }

      dispatch({ type: "SET_RESULTS", results: computed });
      toast.success("Your plan is ready! \u{1F389}", { duration: 4000 });
    } catch {
      toast.error("Network error — could not save your plan. Try again.");
      goTo(3);
    }
  }, [state.goal, state.weight, state.height, goTo, router]);

  const handleDashboard = useCallback(() => {
    // Full navigation so the server sees the new GoalSetting row (avoids RSC cache sending you back to /onboarding).
    window.location.assign("/dashboard");
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
        <ProgressBar progress={PROGRESS_MAP[step]} />

        {step >= 1 && step <= 3 && (
          <div className="flex items-center gap-1.5 px-9 pt-8">
            {[1, 2, 3].map((s) => (
              <span
                key={s}
                className={[
                  "h-[5px] rounded-full transition-all duration-300",
                  s === step ? "w-5 bg-[#BEFF47]" : s < step ? "w-1.5 bg-[#BEFF47]/45" : "w-1.5 bg-white/20",
                ].join(" ")}
              />
            ))}
          </div>
        )}

        <div className="px-9 pb-9 pt-6">
          <AnimatePresence mode="wait" custom={direction}>
            {step === 0 && <WelcomeStep key="welcome" direction={direction} onNext={() => goTo(1)} />}
            {step === 1 && (
              <WeightStep
                key="weight"
                direction={direction}
                value={weight}
                onChange={(v) => dispatch({ type: "SET_WEIGHT", value: v })}
                onBack={() => goTo(0)}
                onNext={() => goTo(2)}
              />
            )}
            {step === 2 && (
              <HeightStep
                key="height"
                direction={direction}
                value={height}
                onChange={(v) => dispatch({ type: "SET_HEIGHT", value: v })}
                onBack={() => goTo(1)}
                onNext={() => goTo(3)}
              />
            )}
            {step === 3 && (
              <GoalStep
                key="goal"
                direction={direction}
                selected={goal}
                onSelect={(g) => dispatch({ type: "SET_GOAL", goal: g })}
                onBack={() => goTo(2)}
                onNext={handleFinish}
              />
            )}
            {step === 4 && (
              <ProcessingStep key="processing" direction={direction} results={results} onDashboard={handleDashboard} />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
