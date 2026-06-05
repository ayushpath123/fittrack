"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Flame, Scale } from "lucide-react";
import { FirstLogCelebration } from "@/components/FirstLogCelebration";
import { DashboardWeightCard } from "@/components/dashboard/DashboardWeightCard";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import { PushReminderOptIn } from "@/components/PushReminderOptIn";
import type { LoggableMealTemplate, MacroSnapshot } from "@/lib/meal-templates";
import { normalizeMealType } from "@/lib/meal-templates";
import type { WeightLogType } from "@/types";

export type DashboardHomeClientProps = {
  targets: MacroSnapshot;
  totals: MacroSnapshot;
  recommendedTemplate: LoggableMealTemplate;
  streak: number;
  streakAfterFirstLogToday: number;
  mealsLoggedToday: boolean;
  weightLogs: WeightLogType[];
  weightLoggedToday: boolean;
  dateKey: string;
  waterGoalMl: number;
  initialWaterMl: number;
  showWelcome?: boolean;
};

function labelMealType(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function DashboardHomeClient({
  targets,
  totals,
  recommendedTemplate,
  streak,
  streakAfterFirstLogToday,
  mealsLoggedToday,
  weightLogs,
  weightLoggedToday,
  dateKey,
  waterGoalMl,
  initialWaterMl,
  showWelcome,
}: DashboardHomeClientProps) {
  const router = useRouter();
  const [isLogging, setIsLogging] = useState(false);
  const [logError, setLogError] = useState("");
  const [localTotals, setLocalTotals] = useState(totals);
  const [dismissWelcome, setDismissWelcome] = useState(false);
  const [loggedToday, setLoggedToday] = useState(mealsLoggedToday);
  const [displayStreak, setDisplayStreak] = useState(streak);
  const [flameActive, setFlameActive] = useState(false);
  const [celebration, setCelebration] = useState<{ calories: number; protein: number; streakDays: number } | null>(
    null,
  );

  const remaining = {
    calories: Math.max(0, Math.round(targets.calories - localTotals.calories)),
    protein: Math.max(0, Math.round(targets.protein - localTotals.protein)),
  };
  const caloriePct = Math.min(100, Math.round((localTotals.calories / Math.max(1, targets.calories)) * 100));
  const proteinPct = Math.min(100, Math.round((localTotals.protein / Math.max(1, targets.protein)) * 100));

  useEffect(() => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem("fittrack-remaining-kcal", String(remaining.calories));
  }, [remaining.calories]);

  async function quickLogRecommended() {
    setIsLogging(true);
    setLogError("");
    try {
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          date: new Date().toISOString().split("T")[0],
          mealType: normalizeMealType(recommendedTemplate.mealType),
          items: [],
          macros: {
            calories: recommendedTemplate.calories,
            protein: recommendedTemplate.protein,
            carbs: recommendedTemplate.carbs,
            fat: recommendedTemplate.fat,
          },
        }),
      });
      if (!res.ok) throw new Error("save failed");
      const wasFirstToday = !loggedToday;
      setLocalTotals((prev) => ({
        calories: prev.calories + recommendedTemplate.calories,
        protein: prev.protein + recommendedTemplate.protein,
        carbs: prev.carbs + recommendedTemplate.carbs,
        fat: prev.fat + recommendedTemplate.fat,
      }));
      if (typeof window !== "undefined") {
        window.localStorage.setItem("fittrack-first-log-done", "1");
      }
      if (wasFirstToday) {
        setLoggedToday(true);
        setDisplayStreak(streakAfterFirstLogToday);
        setFlameActive(true);
        setCelebration({
          calories: recommendedTemplate.calories,
          protein: recommendedTemplate.protein,
          streakDays: streakAfterFirstLogToday,
        });
      } else {
        router.refresh();
      }
    } catch {
      setLogError("Could not log meal. Open Log tab to retry.");
    } finally {
      setIsLogging(false);
    }
  }

  function closeCelebration() {
    setCelebration(null);
    setFlameActive(false);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {celebration ? (
        <FirstLogCelebration
          calories={celebration.calories}
          protein={celebration.protein}
          streakDays={celebration.streakDays}
          onClose={closeCelebration}
        />
      ) : null}
      {showWelcome && !dismissWelcome ? (
        <div className="rounded-2xl border border-[rgba(190,255,71,.28)] bg-[rgba(190,255,71,.1)] px-4 py-3">
          <p className="text-sm font-semibold text-[#D6FF9C]">You&apos;re set up</p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">Log meals in one tap. Come back tomorrow to keep your streak.</p>
          <button
            type="button"
            onClick={() => setDismissWelcome(true)}
            className="mt-2 text-[11px] font-semibold text-[#B8E86A]"
          >
            Got it
          </button>
        </div>
      ) : null}

      <div className="premium-card rounded-2xl p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">Calories left</p>
            <p className="mt-1 text-3xl font-bold text-[var(--white)]">
              {remaining.calories}
              <span className="ml-1 text-sm font-medium text-[var(--muted)]">kcal</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl border border-orange-400/30 bg-orange-400/10 px-2.5 py-1.5">
            <Flame
              size={14}
              className={`text-orange-400 ${flameActive ? "animate-fire-flicker" : ""}`}
              aria-hidden
            />
            <span className="text-sm font-bold tabular-nums text-[var(--white)]">{displayStreak}</span>
            <span className="text-[10px] text-[var(--muted)]">day streak</span>
          </div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[#3B82F6] transition-all duration-300"
            style={{ width: `${caloriePct}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">
          {Math.round(localTotals.calories)} / {targets.calories} kcal · Protein {Math.round(localTotals.protein)} /{" "}
          {targets.protein}g ({proteinPct}%)
        </p>
        {!loggedToday && displayStreak > 0 ? (
          <p className="mt-1 text-xs text-amber-400/90">Log today to keep your streak alive.</p>
        ) : null}
      </div>

      <div className="premium-card rounded-2xl p-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">Log next meal</p>
        <p className="mt-1 text-sm font-semibold text-[var(--white)]">{recommendedTemplate.name}</p>
        <p className="mt-0.5 text-xs text-[var(--muted)]">
          {recommendedTemplate.calories} kcal · P {recommendedTemplate.protein}g · C {recommendedTemplate.carbs}g · F{" "}
          {recommendedTemplate.fat}g
        </p>
        <button
          type="button"
          disabled={isLogging}
          onClick={() => void quickLogRecommended()}
          className="mt-3 w-full min-h-12 rounded-xl bg-[#BEFF47] py-3 text-sm font-semibold text-[#06080A] transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          {isLogging ? "Logging…" : `Log ${labelMealType(recommendedTemplate.mealType)}`}
        </button>
        <Link
          href={`/meals?slot=${recommendedTemplate.mealType}`}
          className="mt-2 block text-center text-[11px] font-semibold text-[#B8E86A]"
        >
          More templates or custom macros
        </Link>
        {logError ? <p className="mt-2 text-xs text-red-400">{logError}</p> : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/weight"
          className="premium-card flex items-center gap-2 rounded-xl px-3 py-3 transition-transform active:scale-95"
        >
          <Scale size={16} className="text-[#BEFF47]" />
          <div>
            <p className="text-[11px] font-semibold text-[var(--white)]">Weight</p>
            <p className="text-[10px] text-[var(--muted)]">{weightLoggedToday ? "Logged" : "Log weekly"}</p>
          </div>
        </Link>
        <HydrationQuick dateKey={dateKey} goalMl={waterGoalMl} initialTotalMl={initialWaterMl} />
      </div>

      <DashboardWeightCard logs={weightLogs} todayLogged={weightLoggedToday} />

      <PushReminderOptIn />
      <PwaInstallPrompt />
    </div>
  );
}

function HydrationQuick({
  dateKey,
  goalMl,
  initialTotalMl,
}: {
  dateKey: string;
  goalMl: number;
  initialTotalMl: number;
}) {
  const [totalMl, setTotalMl] = useState(initialTotalMl);
  const [pending, setPending] = useState(false);

  async function add(ml: number) {
    setPending(true);
    try {
      const res = await fetch("/api/hydration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ addMl: ml, date: dateKey }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { totalMl: number };
      setTotalMl(data.totalMl);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="premium-card rounded-xl px-3 py-3">
      <p className="text-[11px] font-semibold text-[var(--white)]">Water</p>
      <p className="text-[10px] text-[var(--muted)]">
        {totalMl} / {goalMl} ml
      </p>
      <div className="mt-2 flex gap-1">
        {[250, 500].map((ml) => (
          <button
            key={ml}
            type="button"
            disabled={pending}
            onClick={() => void add(ml)}
            className="flex-1 rounded-lg border border-[rgba(87,180,255,.25)] bg-[rgba(87,180,255,.1)] py-1 text-[10px] font-semibold text-[#57B4FF] disabled:opacity-50"
          >
            +{ml}
          </button>
        ))}
      </div>
    </div>
  );
}
