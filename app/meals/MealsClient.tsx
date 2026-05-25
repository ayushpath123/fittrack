"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Sparkles, Utensils } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { FoodPicker } from "@/components/FoodPicker";
import { GamificationPanel } from "@/components/GamificationPanel";
import { InsightCallout } from "@/components/InsightCallout";
import { MealCard } from "@/components/MealCard";
import { PrimaryActionBar } from "@/components/PrimaryActionBar";
import { ProgressSummaryCard } from "@/components/ProgressSummaryCard";
import { SectionHeader } from "@/components/SectionHeader";
import { Toast } from "@/components/Toast";
import type { FoodItemType, MealEntryType, MealEstimateType, MealItem, MealTemplateType } from "@/types";

type DraftItem = {
  foodId: string;
  name: string;
  multiplier: number;
};

const MEAL_TYPES = ["breakfast", "lunch", "snack", "dinner"] as const;

function toMealTypeLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function MealsClient({
  initialEntries,
  foods,
  templates,
  initialEstimates,
  calorieTarget,
  proteinTarget,
}: {
  initialEntries: MealEntryType[];
  foods: FoodItemType[];
  templates: MealTemplateType[];
  initialEstimates: MealEstimateType[];
  calorieTarget: number;
  proteinTarget: number;
  carbTarget: number;
  fatTarget: number;
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [mealType, setMealType] = useState<(typeof MEAL_TYPES)[number]>("lunch");
  const [selectedEstimateId, setSelectedEstimateId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const foodById = useMemo(() => new Map(foods.map((food) => [food.id, food])), [foods]);
  const totals = useMemo(
    () => ({
      calories: entries.reduce((sum, entry) => sum + entry.totalCalories, 0),
      protein: entries.reduce((sum, entry) => sum + entry.totalProtein, 0),
      mealCount: entries.length,
    }),
    [entries],
  );

  const calorieProgress = Math.round((totals.calories / Math.max(1, calorieTarget)) * 100);
  const proteinProgress = Math.round((totals.protein / Math.max(1, proteinTarget)) * 100);
  const sortedEntries = [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  function addFood(food: FoodItemType) {
    setSelectedEstimateId("");
    setDraftItems((prev) => {
      const existing = prev.find((item) => item.foodId === food.id);
      if (existing) {
        return prev.map((item) =>
          item.foodId === food.id ? { ...item, multiplier: Math.min(4, Number((item.multiplier + 0.5).toFixed(1))) } : item,
        );
      }
      return [...prev, { foodId: food.id, name: food.name, multiplier: 1 }];
    });
  }

  function addFoods(foodsToAdd: FoodItemType[]) {
    for (const food of foodsToAdd) addFood(food);
  }

  function applyTemplate(template: MealTemplateType) {
    const mapped = template.items
      .map((item) => {
        const food = foodById.get(item.foodId);
        if (!food) return null;
        return {
          foodId: item.foodId,
          name: food.name,
          multiplier: Math.max(0.5, Number(item.quantityMultiplier || 1)),
        };
      })
      .filter((item): item is DraftItem => !!item);
    if (mapped.length) {
      setSelectedEstimateId("");
      setDraftItems(mapped);
      if (template.mealType && MEAL_TYPES.includes(template.mealType as (typeof MEAL_TYPES)[number])) {
        setMealType(template.mealType as (typeof MEAL_TYPES)[number]);
      }
    }
  }

  function removeDraftItem(foodId: string) {
    setDraftItems((prev) => prev.filter((item) => item.foodId !== foodId));
  }

  function updateDraftMultiplier(foodId: string, next: number) {
    const safe = Math.max(0.5, Number(next.toFixed(1)));
    setDraftItems((prev) => prev.map((item) => (item.foodId === foodId ? { ...item, multiplier: safe } : item)));
  }

  async function logMeal() {
    if (draftItems.length === 0 && !selectedEstimateId) return;
    setIsSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload: { date: string; mealType: string; items: MealItem[]; estimateId?: string } = {
        date: new Date().toISOString().split("T")[0],
        mealType,
        items: draftItems.map((item) => ({ foodId: item.foodId, multiplier: item.multiplier })),
      };
      if (selectedEstimateId && draftItems.length === 0) payload.estimateId = selectedEstimateId;

      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Unable to save meal");
      const saved = (await res.json()) as MealEntryType;
      setEntries((prev) => [...prev, { ...saved, date: String(saved.date), items: (saved.items as MealItem[]) ?? [] }]);
      setDraftItems([]);
      setSelectedEstimateId("");
      setSuccess(`${toMealTypeLabel(mealType)} logged. Nice consistency.`);
    } catch {
      setError("Could not log meal. Please retry.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteMeal(id: string) {
    setError("");
    const res = await fetch(`/api/meals/${id}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) return setError("Could not delete meal.");
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Daily nutrition"
        title="Meals"
        subtitle="Log quickly, stay consistent, and keep momentum."
        action={
          <Link
            href="/analytics"
            className="inline-flex min-h-10 items-center rounded-xl border border-[rgba(190,255,71,.32)] bg-[rgba(190,255,71,.12)] px-3 py-1.5 text-xs font-semibold text-[#B8E86A]"
          >
            Stats
          </Link>
        }
      />

      <GamificationPanel compact />

      <PrimaryActionBar
        title="Next best step"
        subtitle="Pick your meal type, add food items, then log in one tap."
        action={
          <button
            disabled={isSaving || (draftItems.length === 0 && !selectedEstimateId)}
            onClick={logMeal}
            className="rounded-xl bg-[#BEFF47] px-4 py-2 text-xs font-semibold text-[#06080A] min-h-10 disabled:opacity-40"
          >
            {isSaving ? "Saving..." : "Log meal"}
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <ProgressSummaryCard
          label="Calories"
          value={`${Math.round(totals.calories)} kcal`}
          subtext={`Target ${calorieTarget}`}
          progress={calorieProgress}
          progressTone="amber"
        />
        <ProgressSummaryCard
          label="Protein"
          value={`${Math.round(totals.protein)} g`}
          subtext={`Target ${proteinTarget}g`}
          progress={proteinProgress}
          progressTone="green"
        />
        <ProgressSummaryCard
          label="Meals"
          value={`${totals.mealCount}`}
          subtext="Logged today"
          progress={Math.min(100, totals.mealCount * 25)}
          progressTone="blue"
        />
      </div>

      <div className="premium-card rounded-2xl p-4 space-y-0.5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)]">Log builder</p>
        <div className="mt-3 flex gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
          {MEAL_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setMealType(type)}
              className={`flex-1 rounded-[10px] py-1.5 text-xs font-semibold transition-all ${
                mealType === type ? "bg-[#BEFF47] text-[#06080A]" : "text-[var(--muted)]"
              }`}
            >
              {toMealTypeLabel(type)}
            </button>
          ))}
        </div>

        <div className="mt-3">
          <FoodPicker foods={foods} onSelect={addFood} onSelectMany={addFoods} selectedIds={draftItems.map((item) => item.foodId)} />
        </div>

        {templates.length > 0 ? (
          <div className="mt-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">Use template</p>
            <div className="flex flex-wrap gap-1.5">
              {templates.slice(0, 5).map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => applyTemplate(template)}
                  className="rounded-full border border-white/[0.12] bg-white/[0.05] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--white)]"
                >
                  {template.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {initialEstimates.length > 0 ? (
          <div className="mt-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">AI estimates</p>
            <div className="space-y-1.5">
              {initialEstimates
                .filter((estimate) => estimate.status !== "used")
                .slice(0, 3)
                .map((estimate) => (
                  <button
                    key={estimate.id}
                    type="button"
                    onClick={() => {
                      setDraftItems([]);
                      setSelectedEstimateId(estimate.id);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left ${
                      selectedEstimateId === estimate.id
                        ? "border-[rgba(190,255,71,.35)] bg-[rgba(190,255,71,.12)]"
                        : "border-white/[0.08] bg-white/[0.03]"
                    }`}
                  >
                    <span className="text-xs text-[var(--white)]">
                      {estimate.calories} kcal · {estimate.protein}g protein
                    </span>
                    <span className="text-[10px] text-[var(--muted)]">{estimate.confidence}% conf</span>
                  </button>
                ))}
            </div>
          </div>
        ) : null}

        {draftItems.length > 0 ? (
          <div className="mt-3 space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">Selected foods</p>
            {draftItems.map((item) => (
              <div key={item.foodId} className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2">
                <p className="text-xs font-medium text-[var(--white)]">{item.name}</p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateDraftMultiplier(item.foodId, item.multiplier - 0.5)}
                    className="rounded-md border border-white/[0.15] px-2 py-0.5 text-xs text-[var(--white)]"
                  >
                    -
                  </button>
                  <span className="w-10 text-center text-xs text-[var(--muted)]">{item.multiplier}x</span>
                  <button
                    type="button"
                    onClick={() => updateDraftMultiplier(item.foodId, item.multiplier + 0.5)}
                    className="rounded-md border border-white/[0.15] px-2 py-0.5 text-xs text-[var(--white)]"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => removeDraftItem(item.foodId)}
                    className="rounded-md border border-[rgba(255,92,122,.35)] bg-[rgba(255,92,122,.12)] px-2 py-0.5 text-xs text-[#FF5C7A]"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {(totals.mealCount === 0 || totals.protein < proteinTarget * 0.45) && (
        <InsightCallout
          title={totals.mealCount === 0 ? "Start today strong" : "Protein is behind target"}
          body={
            totals.mealCount === 0
              ? "One logged meal is enough to build momentum. Keep the streak alive."
              : "Add one protein-focused meal now to make evening choices easier."
          }
          icon={<Sparkles size={14} />}
          action={
            <Link
              href="/meals/ai"
              className="inline-flex items-center rounded-lg border border-[rgba(190,255,71,.3)] bg-[rgba(190,255,71,.12)] px-2.5 py-1 text-[11px] font-semibold text-[#B8E86A]"
            >
              Try AI meal helper
            </Link>
          }
        />
      )}

      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)]">Today&apos;s log</p>
        {sortedEntries.map((entry) => (
          <MealCard
            key={entry.id}
            mealType={entry.mealType}
            items={entry.items.map(() => ({ emoji: "🍽️" }))}
            description={toMealTypeLabel(entry.mealType)}
            calories={entry.totalCalories}
            protein={entry.totalProtein}
            color="green"
            time={new Date(entry.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            onDelete={() => deleteMeal(entry.id)}
          />
        ))}
        {sortedEntries.length === 0 ? (
          <EmptyState
            title="No meals logged today"
            subtitle="Start with one quick meal entry to unlock motivation and trends."
            actionLabel="Log first meal"
            actionHref="/meals?action=log"
          />
        ) : null}
      </div>

      <Toast message={error} type="error" />
      <Toast message={success} type="info" />

      <Link
        href="/meals/ai"
        className="inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-xl border border-[rgba(190,255,71,.25)] bg-[rgba(190,255,71,.07)] py-2.5 text-sm font-semibold text-[#B8E86A]"
      >
        <Utensils size={14} />
        Open AI meal estimate
      </Link>
    </div>
  );
}
