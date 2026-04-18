"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Star } from "lucide-react";
import { FoodItemType } from "@/types";

interface FoodPickerProps {
  foods: FoodItemType[];
  onSelect: (food: FoodItemType) => void;
  onSelectMany?: (foods: FoodItemType[]) => void;
  selectedIds?: string[];
}

export function FoodPicker({ foods, onSelect, onSelectMany, selectedIds = [] }: FoodPickerProps) {
  const [q, setQ] = useState("");
  const [pickedIds, setPickedIds] = useState<string[]>([]);
  const [chip, setChip] = useState<"all" | "highProtein" | "lowCal" | "budget">("all");
  const [remoteFoods, setRemoteFoods] = useState<FoodItemType[]>(foods);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const cacheRef = useRef<Map<string, { foods: FoodItemType[]; nextCursor: string | null }>>(new Map());
  const requestSeqRef = useRef(0);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem("meals_favorite_food_ids");
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as string[];
      return Array.isArray(parsed) ? parsed.slice(0, 40) : [];
    } catch {
      return [];
    }
  });
  const [recentlyUsedIds, setRecentlyUsedIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem("meals_recent_food_ids");
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as string[];
      return Array.isArray(parsed) ? parsed.slice(0, 20) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    setRemoteFoods(foods);
  }, [foods]);

  useEffect(() => {
    const seq = ++requestSeqRef.current;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const cacheKey = `${q.trim()}::first`;
      const cached = cacheRef.current.get(cacheKey);
      if (cached) {
        setRemoteFoods(cached.foods);
        setNextCursor(cached.nextCursor);
        return;
      }
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        params.set("limit", "50");
        const res = await fetch(`/api/food?${params.toString()}`, { credentials: "include", signal: controller.signal });
        if (!res.ok) return;
        const data = (await res.json()) as { foods: FoodItemType[]; nextCursor?: string | null };
        if (requestSeqRef.current !== seq) return;
        const next = {
          foods: Array.isArray(data.foods) ? data.foods : [],
          nextCursor: data.nextCursor ?? null,
        };
        cacheRef.current.set(cacheKey, next);
        setRemoteFoods(next.foods);
        setNextCursor(next.nextCursor);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
      } finally {
        if (requestSeqRef.current === seq) setIsLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  const filtered = remoteFoods.filter((f) => {
    const qMatch = f.name.toLowerCase().includes(q.toLowerCase());
    if (!qMatch) return false;
    if (chip === "highProtein") return f.protein >= 10;
    if (chip === "lowCal") return f.calories <= 150;
    if (chip === "budget") return f.price <= 30;
    return true;
  });
  const ranked = [...filtered].sort((a, b) => {
    const aFav = favoriteIds.includes(a.id) ? 1 : 0;
    const bFav = favoriteIds.includes(b.id) ? 1 : 0;
    if (aFav !== bFav) return bFav - aFav;
    const aRecent = recentlyUsedIds.includes(a.id) ? 1 : 0;
    const bRecent = recentlyUsedIds.includes(b.id) ? 1 : 0;
    if (aRecent !== bRecent) return bRecent - aRecent;
    return a.name.localeCompare(b.name);
  });
  const selectedSet = new Set(selectedIds);
  const byId = useMemo(() => new Map(remoteFoods.map((f) => [f.id, f])), [remoteFoods]);

  function markRecent(foodId: string) {
    setRecentlyUsedIds((prev) => {
      const next = [foodId, ...prev.filter((id) => id !== foodId)].slice(0, 20);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("meals_recent_food_ids", JSON.stringify(next));
      }
      return next;
    });
  }

  function toggleFavorite(foodId: string) {
    setFavoriteIds((prev) => {
      const next = prev.includes(foodId) ? prev.filter((id) => id !== foodId) : [foodId, ...prev].slice(0, 40);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("meals_favorite_food_ids", JSON.stringify(next));
      }
      return next;
    });
  }

  function togglePick(id: string) {
    setPickedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function addSelectedFoods() {
    if (!onSelectMany || pickedIds.length === 0) return;
    const pickedFoods = pickedIds.map((id) => byId.get(id)).filter((f): f is FoodItemType => !!f && !selectedSet.has(f.id));
    if (pickedFoods.length > 0) onSelectMany(pickedFoods);
    for (const food of pickedFoods) markRecent(food.id);
    setPickedIds([]);
  }

  async function loadMore() {
    if (!nextCursor || isLoading) return;
    const cacheKey = `${q.trim()}::${nextCursor}`;
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      const seen = new Set(remoteFoods.map((f) => f.id));
      const merged = [...remoteFoods];
      for (const food of cached.foods) {
        if (!seen.has(food.id)) {
          merged.push(food);
          seen.add(food.id);
        }
      }
      setRemoteFoods(merged);
      setNextCursor(cached.nextCursor);
      return;
    }
    setIsLoading(true);
    const controller = new AbortController();
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      params.set("limit", "50");
      params.set("cursor", nextCursor);
      const res = await fetch(`/api/food?${params.toString()}`, { credentials: "include", signal: controller.signal });
      if (!res.ok) return;
      const data = (await res.json()) as { foods: FoodItemType[]; nextCursor?: string | null };
      const page = {
        foods: Array.isArray(data.foods) ? data.foods : [],
        nextCursor: data.nextCursor ?? null,
      };
      cacheRef.current.set(cacheKey, page);
      const seen = new Set(remoteFoods.map((f) => f.id));
      const merged = [...remoteFoods];
      for (const food of page.foods) {
        if (!seen.has(food.id)) {
          merged.push(food);
          seen.add(food.id);
        }
      }
      setRemoteFoods(merged);
      setNextCursor(page.nextCursor);
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
    } finally {
      setIsLoading(false);
      controller.abort();
    }
  }

  return (
    <div>
      <div className="relative mb-2">
        <Search size={15} className="absolute left-3.5 top-3 text-[var(--muted)]" />
        <input
          className="w-full rounded-xl border border-[rgba(255,255,255,.12)] bg-[rgba(255,255,255,.05)] py-2 pl-9 pr-3.5 text-sm text-[var(--white)] transition-all placeholder:text-[var(--hint)] focus:border-[rgba(190,255,71,.55)] focus:bg-[rgba(255,255,255,.09)] focus:outline-none focus:ring-2 focus:ring-[rgba(190,255,71,.22)]"
          placeholder="Search ingredients..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="mb-2 flex gap-1.5">
        {[
          { id: "all", label: "All" },
          { id: "highProtein", label: "High protein" },
          { id: "lowCal", label: "Low cal" },
          { id: "budget", label: "Budget" },
        ].map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setChip(c.id as "all" | "highProtein" | "lowCal" | "budget")}
            className={`rounded-full border px-2 py-1 text-[10px] font-semibold transition-colors ${
              chip === c.id
                ? "border-[rgba(190,255,71,.35)] bg-[rgba(190,255,71,.15)] text-[#B8E86A]"
                : "border-[rgba(255,255,255,.1)] bg-[rgba(255,255,255,.04)] text-[var(--muted)]"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {isLoading ? <p className="py-2 text-center text-xs text-[var(--muted)]">Loading...</p> : null}
        {ranked.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--muted)]">No foods match that search.</p>
        ) : null}
        {ranked.map((food) => (
          <div
            key={food.id}
            className="w-full flex items-center gap-2 px-2 py-1 rounded-xl border border-transparent hover:bg-[rgba(255,255,255,.05)] hover:border-[rgba(255,255,255,.08)]"
          >
            <button
              onClick={() => {
                if (onSelectMany) {
                  togglePick(food.id);
                } else {
                  markRecent(food.id);
                  onSelect(food);
                }
              }}
              className="flex-1 flex justify-between items-center px-1 py-1 text-left active:scale-95 transition-transform"
            >
              <div>
                <p className="text-sm font-medium text-[var(--white)]">{food.name}</p>
                <p className="text-xs text-[var(--muted)]">{food.baseQuantity}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-xs font-medium text-[var(--white)]">{food.calories} kcal</p>
                  <p className="text-[10px] text-[var(--muted)] leading-tight">
                    P {food.protein} · C {food.carbs} · F {food.fat}
                  </p>
                </div>
                {onSelectMany ? (
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-md border text-[10px] font-semibold ${
                      selectedSet.has(food.id) || pickedIds.includes(food.id)
                        ? "border-[#BEFF47] bg-[#BEFF47] text-white"
                        : "border-[rgba(255,255,255,.14)] text-[var(--muted)]"
                    }`}
                  >
                    {selectedSet.has(food.id) ? "✓" : pickedIds.includes(food.id) ? "+" : ""}
                  </span>
                ) : null}
              </div>
            </button>
            <button
              type="button"
              aria-label={favoriteIds.includes(food.id) ? `Unfavorite ${food.name}` : `Favorite ${food.name}`}
              onClick={() => toggleFavorite(food.id)}
              className={`rounded-lg border p-1.5 ${
                favoriteIds.includes(food.id)
                  ? "border-[rgba(255,181,71,.45)] bg-[rgba(255,181,71,.16)] text-[#FFCF80]"
                  : "border-[rgba(255,255,255,.14)] text-[var(--muted)]"
              }`}
            >
              <Star size={12} fill={favoriteIds.includes(food.id) ? "currentColor" : "none"} />
            </button>
          </div>
        ))}
        {nextCursor ? (
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={isLoading}
            className="mt-1 w-full rounded-xl border border-[rgba(190,255,71,.35)] bg-[rgba(190,255,71,.12)] px-3 py-1.5 text-xs font-semibold text-[#B8E86A] disabled:opacity-60"
          >
            {isLoading ? "Loading..." : "Load more"}
          </button>
        ) : null}
      </div>
      {onSelectMany ? (
        <button
          type="button"
          disabled={pickedIds.length === 0}
          onClick={addSelectedFoods}
          className="mt-2 w-full rounded-xl bg-[#BEFF47] text-[#06080A] hover:bg-[#CCFF5A] py-2 text-sm font-semibold text-white transition-transform active:scale-95 disabled:bg-blue-300 dark:disabled:bg-slate-600"
        >
          Add selected items ({pickedIds.length})
        </button>
      ) : null}
    </div>
  );
}
