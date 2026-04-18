"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Plus, ScanLine, X } from "lucide-react";
import Link from "next/link";
import { FoodItemType, MealEntryType, MealEstimateType, MealItem, MealTemplateType } from "@/types";
import { calculateMealTotals } from "@/lib/calculations";
import { FoodPicker } from "@/components/FoodPicker";
import { Toast } from "@/components/Toast";
import { EmptyState } from "@/components/EmptyState";
import { BarcodeScanModal } from "@/components/BarcodeScanModal";
import { FirstLogCelebration } from "@/components/FirstLogCelebration";
import { MealCard } from "@/components/MealCard";

const MEAL_TYPES = ["Breakfast", "Pre-Workout", "Lunch", "Dinner", "Snack"];
const DRAFT_KEY = "meals_draft_v1";

const mealColorMap: Record<string, "amber" | "blue" | "green" | "purple"> = {
  Breakfast: "amber",
  "Pre-Workout": "purple",
  Lunch: "blue",
  Dinner: "green",
  Snack: "purple",
};

type DraftItem = MealItem & { inputMode: "multiplier" | "grams" };
type SectionKey = "ingredients" | "selected" | "ai" | "barcode";
type BarcodeLookupResult =
  | { exists: true; food: FoodItemType }
  | {
      exists: false;
      product: Pick<FoodItemType, "name" | "baseQuantity" | "baseWeightGrams" | "calories" | "protein" | "carbs" | "fat" | "barcode">;
    };

export function MealsClient({
  initialEntries,
  foods,
  templates,
  initialEstimates,
  calorieTarget,
  proteinTarget,
  carbTarget,
  fatTarget,
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
  function dedupeEntriesById(list: MealEntryType[]) {
    const map = new Map<string, MealEntryType>();
    for (const entry of list) {
      map.set(entry.id, entry);
    }
    return Array.from(map.values());
  }

  const router = useRouter();
  const searchParams = useSearchParams();
  const [entries, setEntries] = useState(() => dedupeEntriesById(initialEntries));
  const [templateList, setTemplateList] = useState(templates);
  const [estimateList] = useState(initialEstimates);
  const [showSheet, setShowSheet] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [mealType, setMealType] = useState(MEAL_TYPES[0]);
  const [mealTypeTouched, setMealTypeTouched] = useState(false);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [undoDeleteMessage, setUndoDeleteMessage] = useState("");
  const [importedFoods, setImportedFoods] = useState<FoodItemType[]>([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeBusy, setBarcodeBusy] = useState(false);
  const [barcodeErr, setBarcodeErr] = useState("");
  const [barcodeDialogOpen, setBarcodeDialogOpen] = useState(false);
  const [barcodeLookup, setBarcodeLookup] = useState<BarcodeLookupResult | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [canScan, setCanScan] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [flashCalories, setFlashCalories] = useState(false);
  const [flashProtein, setFlashProtein] = useState(false);
  const [showTemplateSave, setShowTemplateSave] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [stepDir, setStepDir] = useState<1 | -1>(1);
  const [recipeName, setRecipeName] = useState("");
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    ingredients: true,
    selected: true,
    ai: false,
    barcode: false,
  });
  const [aiEstimate] = useState<{ estimateId: string } | null>(null);
  const pendingDeleteRef = useRef<{ id: string; entry: MealEntryType; timer: ReturnType<typeof setTimeout> } | null>(null);

  function toggleSection(section: SectionKey) {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  function foodEmoji(name: string) {
    const n = name.toLowerCase();
    if (n.includes("oat")) return "🥣";
    if (n.includes("milk")) return "🥛";
    if (n.includes("rice")) return "🍚";
    if (n.includes("dal")) return "🍲";
    if (n.includes("fruit")) return "🍎";
    if (n.includes("paneer")) return "🧀";
    if (n.includes("seed")) return "🌰";
    if (n.includes("dahi")) return "🥣";
    return "🍽️";
  }

  function confidenceLabel(confidence: number) {
    if (confidence >= 0.8) return "High";
    if (confidence >= 0.6) return "Medium";
    return "Low";
  }

  function inferMealTypeByTime(now = new Date()) {
    const hour = now.getHours();
    if (hour < 12) return "Breakfast";
    if (hour < 16) return "Lunch";
    if (hour < 19) return "Snack";
    if (hour < 23) return "Dinner";
    return "Breakfast";
  }

  const openAddMealSheet = useCallback(() => {
    setShowSheet(true);
    setError("");
    setRecipeName("");
    setMealType(inferMealTypeByTime());
    setMealTypeTouched(false);
    setStepDir(1);
    setStep(3);
    setOpenSections({ ingredients: true, selected: true, ai: false, barcode: false });
  }, []);

  useEffect(() => {
    setImportedFoods((prev) => prev.filter((f) => !foods.some((x) => x.id === f.id)));
  }, [foods]);

  useEffect(() => {
    setEntries(dedupeEntriesById(initialEntries));
  }, [initialEntries]);

  useEffect(() => {
    setCanScan(typeof window !== "undefined" && "BarcodeDetector" in window);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { mealType?: string; recipeName?: string; items?: DraftItem[] };
      if (parsed.mealType && MEAL_TYPES.includes(parsed.mealType)) setMealType(parsed.mealType);
      if (parsed.recipeName) setRecipeName(parsed.recipeName);
      if (Array.isArray(parsed.items) && parsed.items.length > 0) {
        setItems(parsed.items);
        setInfoMessage("Restored your saved meal draft.");
      }
    } catch {
      window.localStorage.removeItem(DRAFT_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!items.length && !recipeName.trim()) {
      window.localStorage.removeItem(DRAFT_KEY);
      return;
    }
    window.localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        mealType,
        recipeName,
        items,
      }),
    );
  }, [items, mealType, recipeName]);

  useEffect(() => {
    return () => {
      if (pendingDeleteRef.current) clearTimeout(pendingDeleteRef.current.timer);
    };
  }, []);

  const catalogFoods = useMemo(() => {
    const m = new Map<string, FoodItemType>();
    for (const f of foods) m.set(f.id, f);
    for (const f of importedFoods) m.set(f.id, f);
    return Array.from(m.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [foods, importedFoods]);
  const foodById = useMemo(() => {
    const byId = new Map<string, FoodItemType>();
    for (const food of catalogFoods) byId.set(food.id, food);
    return byId;
  }, [catalogFoods]);
  const quickAddFoods = useMemo(() => {
    if (typeof window === "undefined") return [] as FoodItemType[];
    let favoriteIds: string[] = [];
    let recentIds: string[] = [];
    try {
      favoriteIds = JSON.parse(window.localStorage.getItem("meals_favorite_food_ids") ?? "[]") as string[];
      recentIds = JSON.parse(window.localStorage.getItem("meals_recent_food_ids") ?? "[]") as string[];
    } catch {
      return [];
    }
    const ordered = [...favoriteIds, ...recentIds];
    const seen = new Set<string>();
    const out: FoodItemType[] = [];
    for (const id of ordered) {
      if (seen.has(id)) continue;
      const food = foodById.get(id);
      if (!food) continue;
      seen.add(id);
      out.push(food);
      if (out.length >= 6) break;
    }
    return out;
  }, [foodById]);
  const filteredTemplates = useMemo(
    () => templateList.filter((t) => !t.mealType || t.mealType === mealType),
    [templateList, mealType],
  );

  const uniqueEntries = useMemo(() => dedupeEntriesById(entries), [entries]);
  const recentCombos = useMemo(() => {
    const comboMap = new Map<
      string,
      { foodIds: string[]; count: number; lastUsedAt: number; mealType: string; label: string }
    >();
    for (const entry of uniqueEntries) {
      const foodIds = Array.from(new Set((entry.items ?? []).map((it) => it.foodId))).sort();
      if (foodIds.length < 2) continue;
      const key = foodIds.join("|");
      const mealNames = foodIds
        .slice(0, 3)
        .map((id) => foodById.get(id)?.name)
        .filter((name): name is string => !!name);
      const label = mealNames.join(" + ");
      const current = comboMap.get(key);
      const ts = new Date(entry.date).getTime();
      if (!current) {
        comboMap.set(key, { foodIds, count: 1, lastUsedAt: ts, mealType: entry.mealType, label });
      } else {
        current.count += 1;
        if (ts > current.lastUsedAt) {
          current.lastUsedAt = ts;
          current.mealType = entry.mealType;
          current.label = label;
        }
      }
    }
    return Array.from(comboMap.values())
      .sort((a, b) => (b.count === a.count ? b.lastUsedAt - a.lastUsedAt : b.count - a.count))
      .slice(0, 4);
  }, [uniqueEntries, foodById]);
  const suggestedTemplates = useMemo(() => {
    const recentFoodIds = new Set(uniqueEntries.slice(-8).flatMap((entry) => (entry.items ?? []).map((it) => it.foodId)));
    return filteredTemplates
      .map((template) => ({
        template,
        overlap: template.items.reduce((acc, item) => acc + (recentFoodIds.has(item.foodId) ? 1 : 0), 0),
      }))
      .filter((row) => row.overlap > 0)
      .sort((a, b) => b.overlap - a.overlap)
      .slice(0, 3)
      .map((row) => row.template);
  }, [filteredTemplates, uniqueEntries]);
  const entriesByMealType = useMemo(() => {
    const byType = new Map<string, MealEntryType[]>();
    for (const type of MEAL_TYPES) byType.set(type, []);
    for (const entry of uniqueEntries) {
      const group = byType.get(entry.mealType);
      if (group) group.push(entry);
    }
    return byType;
  }, [uniqueEntries]);
  const totalCalories = uniqueEntries.reduce((s, e) => s + e.totalCalories, 0);
  const totalProtein = uniqueEntries.reduce((s, e) => s + e.totalProtein, 0);
  const totalCarbs = uniqueEntries.reduce((s, e) => s + (e.totalCarbs ?? 0), 0);
  const totalFat = uniqueEntries.reduce((s, e) => s + (e.totalFat ?? 0), 0);
  const { totalCalories: draftCal, totalProtein: draftProt, totalCarbs: draftCarbs, totalFat: draftFat } = calculateMealTotals(
    catalogFoods,
    items,
  );

  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "log") {
      openAddMealSheet();
    }
    if (action === "scan") {
      setBarcodeDialogOpen(true);
    }
    if (action === "ai") {
      router.push("/meals/ai");
    }
  }, [openAddMealSheet, router, searchParams]);

  useEffect(() => {
    if (!showSheet || step !== 3) return;
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void logMeal();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const first = quickAddFoods[0];
        if (first) addFood(first);
      }
      if (e.key === "?") {
        e.preventDefault();
        setShowKeyboardHelp((prev) => !prev);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // Keyboard shortcuts are intentionally scoped to sheet visibility and quick-add context.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSheet, step, quickAddFoods]);

  function loadTemplate(t: MealTemplateType) {
    setRecipeName(t.name);
    if (t.mealType) {
      setMealType(t.mealType);
      setMealTypeTouched(true);
    }
    setItems(
      t.items.map((i) => ({
        foodId: i.foodId,
        multiplier: i.quantityMultiplier,
        inputMode: "multiplier" as const,
      })),
    );
    setStepDir(1);
    setStep(3);
  }

  function applyRecentCombo(combo: { foodIds: string[]; mealType: string }) {
    setMealType(combo.mealType);
    setMealTypeTouched(true);
    setItems(
      combo.foodIds.map((foodId) => ({
        foodId,
        multiplier: 1,
        inputMode: "multiplier" as const,
      })),
    );
    setStepDir(1);
    setStep(3);
    setShowSheet(true);
  }

  async function saveCurrentAsTemplate(nameInput?: string) {
    if (!items.length) return;
    const name = (nameInput ?? templateName).trim();
    if (!name) return;

    const payloadItems = items.map((item) => {
      const food = foodById.get(item.foodId);
      const fromMultiplier = item.multiplier ?? 1;
      const fromGrams = food && item.grams ? item.grams / food.baseWeightGrams : undefined;
      const quantityMultiplier = fromGrams && Number.isFinite(fromGrams) && fromGrams > 0 ? fromGrams : fromMultiplier;
      return {
        foodId: item.foodId,
        quantityMultiplier,
      };
    });

    try {
      const res = await fetch("/api/food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, mealType, items: payloadItems }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Could not save template.");
        return;
      }
      const saved = (await res.json()) as MealTemplateType;
      setTemplateList((prev) => [saved, ...prev]);
      setError("");
      setTemplateName("");
      setShowTemplateSave(false);
    } catch {
      setError("Could not save template.");
    }
  }

  function addFood(food: FoodItemType) {
    setImportedFoods((prev) => (prev.some((f) => f.id === food.id) ? prev : [...prev, food]));
    setItems((p) => [...p, { foodId: food.id, multiplier: 1, inputMode: "multiplier" }]);
  }

  function addFoods(foodsToAdd: FoodItemType[]) {
    if (!foodsToAdd.length) return;
    setImportedFoods((prev) => {
      const seen = new Set(prev.map((f) => f.id));
      const next = [...prev];
      for (const food of foodsToAdd) {
        if (!seen.has(food.id)) {
          next.push(food);
          seen.add(food.id);
        }
      }
      return next;
    });
    setItems((prev) => {
      const existing = new Set(prev.map((p) => p.foodId));
      const next = [...prev];
      for (const food of foodsToAdd) {
        if (!existing.has(food.id)) next.push({ foodId: food.id, multiplier: 1, inputMode: "multiplier" });
      }
      return next;
    });
  }

  async function importFromBarcode(code: string) {
    const trimmed = code.trim();
    if (!trimmed) return;
    setBarcodeBusy(true);
    setBarcodeErr("");
    setBarcodeLookup(null);
    try {
      const res = await fetch("/api/food/from-barcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: trimmed, save: false }),
      });
      const data = (await res.json()) as ({ error?: string } & BarcodeLookupResult);
      if (!res.ok) {
        setBarcodeErr(typeof data.error === "string" ? data.error : "Could not look up barcode.");
        return;
      }
      setBarcodeLookup(data as BarcodeLookupResult);
    } catch {
      setBarcodeErr("Network error. Try again.");
    } finally {
      setBarcodeBusy(false);
    }
  }

  async function saveLookedUpBarcode() {
    if (!barcodeLookup || barcodeLookup.exists) return;
    setBarcodeBusy(true);
    setBarcodeErr("");
    try {
      const res = await fetch("/api/food/from-barcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: barcodeInput.trim(), save: true }),
      });
      const data = (await res.json()) as ({ error?: string } & FoodItemType);
      if (!res.ok) {
        setBarcodeErr(typeof data.error === "string" ? data.error : "Could not save product.");
        return;
      }
      const food = data as FoodItemType;
      setImportedFoods((prev) => (prev.some((x) => x.id === food.id) ? prev : [...prev, food]));
      setItems((prev) => (prev.some((x) => x.foodId === food.id) ? prev : [...prev, { foodId: food.id, multiplier: 1, inputMode: "multiplier" }]));
      setShowSheet(true);
      setStep(3);
      setBarcodeDialogOpen(false);
      setBarcodeLookup(null);
      setBarcodeInput("");
    } catch {
      setBarcodeErr("Network error while saving product.");
    } finally {
      setBarcodeBusy(false);
    }
  }

  function updateItem(i: number, patch: Partial<DraftItem>) {
    setItems((p) => p.map((item, idx) => (idx === i ? { ...item, ...patch } : item)));
  }

  function removeItem(i: number) {
    setItems((p) => p.filter((_, idx) => idx !== i));
  }

  function moveItem(i: number, direction: -1 | 1) {
    setItems((prev) => {
      const next = [...prev];
      const target = i + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[i], next[target]] = [next[target], next[i]];
      return next;
    });
  }

  async function repeatLastMeal() {
    const sorted = [...uniqueEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const last = sorted[0];
    if (!last) return;
    setIsSaving(true);
    setError("");
    const isFirst = uniqueEntries.length === 0;
    try {
      const cleanItems = last.items.map((item) => ({
        foodId: item.foodId,
        grams: item.grams,
        multiplier: item.multiplier,
      }));
      const date = new Date().toISOString().split("T")[0];
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ date, mealType: last.mealType, items: cleanItems }),
      });
      if (!res.ok) throw new Error("Unable to repeat meal");
      const saved = await res.json();
      setEntries((p) => dedupeEntriesById([...p, saved]));
      if (isFirst) setShowCelebration(true);
      setFlashCalories(true);
      setFlashProtein(true);
      setTimeout(() => setFlashCalories(false), 700);
      setTimeout(() => setFlashProtein(false), 700);
    } catch {
      setError("Could not repeat last meal.");
    } finally {
      setIsSaving(false);
    }
  }

  async function logMeal() {
    if (!items.length) return;
    setIsSaving(true);
    setError("");
    const isFirst = uniqueEntries.length === 0;
    try {
      const cleanItems = items.map((item) => ({
        foodId: item.foodId,
        grams: item.grams,
        multiplier: item.multiplier,
      }));
      const date = new Date().toISOString().split("T")[0];
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ date, mealType, items: cleanItems, estimateId: aiEstimate?.estimateId }),
      });
      if (!res.ok) throw new Error("Unable to log meal");
      const saved = await res.json();
      setEntries((p) => dedupeEntriesById([...p, saved]));
      if (isFirst) setShowCelebration(true);
      setFlashCalories(true);
      setFlashProtein(true);
      setTimeout(() => setFlashCalories(false), 700);
      setTimeout(() => setFlashProtein(false), 700);
      setShowSheet(false);
      setStep(1);
      setItems([]);
      setRecipeName("");
      if (typeof window !== "undefined") window.localStorage.removeItem(DRAFT_KEY);
    } catch {
      setError("Could not log meal. Please retry.");
    } finally {
      setIsSaving(false);
    }
  }

  async function commitDeleteMeal(id: string, snapshot: MealEntryType) {
    const res = await fetch(`/api/meals/${id}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) {
      setEntries((prev) => dedupeEntriesById([...prev, snapshot]));
      setError("Could not delete meal.");
    }
  }

  function undoDeleteMeal() {
    const pending = pendingDeleteRef.current;
    if (!pending) return;
    clearTimeout(pending.timer);
    setEntries((prev) => dedupeEntriesById([...prev, pending.entry]));
    pendingDeleteRef.current = null;
    setUndoDeleteMessage("");
  }

  function deleteMeal(id: string) {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    if (pendingDeleteRef.current) {
      const prevPending = pendingDeleteRef.current;
      clearTimeout(prevPending.timer);
      void commitDeleteMeal(prevPending.id, prevPending.entry);
      pendingDeleteRef.current = null;
    }
    setEntries((p) => p.filter((e) => e.id !== id));
    setUndoDeleteMessage("Meal deleted");
    const timer = setTimeout(() => {
      const current = pendingDeleteRef.current;
      if (!current || current.id !== id) return;
      void commitDeleteMeal(current.id, current.entry);
      pendingDeleteRef.current = null;
      setUndoDeleteMessage("");
    }, 5000);
    pendingDeleteRef.current = { id, entry, timer };
  }

  async function editMealType(id: string, currentType: string) {
    const mealType = window.prompt("Update meal type", currentType)?.trim();
    if (!mealType) return;
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    const res = await fetch(`/api/meals/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mealType,
        totalCalories: entry.totalCalories,
        totalProtein: entry.totalProtein,
        totalCarbs: entry.totalCarbs ?? 0,
        totalFat: entry.totalFat ?? 0,
      }),
    });
    if (!res.ok) {
      setError("Could not update meal.");
      return;
    }
    const updated = await res.json();
    setEntries((p) => p.map((e) => (e.id === id ? { ...e, mealType: updated.mealType } : e)));
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="num text-2xl font-bold tracking-tight text-[var(--white)]">Meals</h1>
        <p className="text-sm text-[var(--muted)]">Log and review today&apos;s intake</p>
      </div>
      <div className="premium-card card-entrance staggered mb-4 rounded-2xl p-4 dark:bg-slate-900/80" style={{ ["--stagger-base" as string]: "0ms", ["--stagger-index" as string]: 1 }}>
        <div className="mb-2 flex items-start justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)]">Today</p>
          {uniqueEntries.length > 0 && (
            <button
              type="button"
              disabled={isSaving}
              onClick={() => void repeatLastMeal()}
              className="text-xs font-medium text-[#BEFF47] shrink-0 disabled:opacity-50"
            >
              Repeat last
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-[var(--muted)]">Calories</p>
            <p
              className="font-bold text-[var(--white)]"
              style={{
                animation: flashCalories ? "flash-confirm .7s ease" : undefined,
                ["--original" as string]: "#111827",
              }}
            >
              {Math.round(totalCalories)}
              <span className="text-xs font-normal text-gray-400 dark:text-slate-400"> / {calorieTarget}</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted)]">Protein</p>
            <p
              className="font-bold text-[var(--white)]"
              style={{
                animation: flashProtein ? "flash-confirm .7s ease" : undefined,
                ["--original" as string]: "#111827",
              }}
            >
              {Math.round(totalProtein)}g / {proteinTarget}g
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted)]">Carbs</p>
            <p className="font-bold text-[var(--white)]">
              {Math.round(totalCarbs)}g / {carbTarget}g
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted)]">Fat</p>
            <p className="font-bold text-[var(--white)]">
              {Math.round(totalFat)}g / {fatTarget}g
            </p>
          </div>
        </div>
      </div>

      <div className="premium-card card-entrance staggered mb-3 rounded-2xl p-3.5" style={{ ["--stagger-base" as string]: "80ms", ["--stagger-index" as string]: 2 }}>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">AI estimate history</p>
          <Link href="/meals/ai" className="text-[10px] font-semibold text-[#B8E86A]">
            Open AI page
          </Link>
        </div>
        {estimateList.length === 0 ? (
          <p className="text-xs text-[var(--muted)]">No AI estimates yet. Open the AI page to create one.</p>
        ) : (
          <div className="space-y-2">
            {estimateList.slice(0, 4).map((est) => (
              <div key={est.id} className="rounded-xl border border-[rgba(255,255,255,.08)] bg-[rgba(255,255,255,.03)] p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-[var(--white)]">
                    {Math.round(est.calories)} kcal · P {Math.round(est.protein)}g · C {Math.round(est.carbs)}g · F {Math.round(est.fat)}g
                  </p>
                  <Link
                    href="/meals/ai"
                    className="rounded-lg border border-[#BEFF47]/30 bg-[#BEFF47]/10 px-2 py-1 text-[10px] font-semibold text-[#B8E86A] hover:bg-[#BEFF47]/16"
                  >
                    View
                  </Link>
                </div>
                <p className="mt-1 text-[10px] text-[var(--muted)]">
                  {new Date(est.createdAt).toLocaleString()} · {confidenceLabel(est.confidence)} confidence · {est.status}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
      {recentCombos.length > 0 ? (
        <div className="premium-card card-entrance staggered mb-3 rounded-2xl p-3.5" style={{ ["--stagger-base" as string]: "100ms", ["--stagger-index" as string]: 2 }}>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Recently logged combos</p>
            <span className="text-[10px] text-[var(--muted)]">One tap</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {recentCombos.map((combo) => (
              <button
                key={`${combo.mealType}-${combo.foodIds.join("-")}`}
                type="button"
                onClick={() => applyRecentCombo(combo)}
                className="rounded-xl border border-[rgba(190,255,71,.32)] bg-[rgba(190,255,71,.12)] px-2.5 py-1 text-[10px] font-semibold text-[#B8E86A]"
              >
                {combo.label || `${combo.foodIds.length} items`} · {combo.count}x
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {MEAL_TYPES.map((type, groupIndex) => {
        const group = entriesByMealType.get(type) ?? [];
        if (!group.length) return null;
        const groupEmojis = Array.from(
          new Set(
            group
              .flatMap((entry) => entry.items ?? [])
              .map((it) => foodById.get(it.foodId))
              .filter(Boolean)
              .map((f) => foodEmoji((f as FoodItemType).name)),
          ),
        ).slice(0, 4);
        return (
          <div
            key={type}
            className="premium-card card-entrance staggered mb-3 rounded-2xl p-4"
            style={{ ["--stagger-base" as string]: "120ms", ["--stagger-index" as string]: groupIndex }}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-[var(--white)]">{type}</p>
              {groupEmojis.length ? (
                <div className="flex items-center gap-1">
                  {groupEmojis.map((emoji, idx) => (
                    <span
                      key={`${type}-${emoji}-${idx}`}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[rgba(255,255,255,.14)] bg-[rgba(255,255,255,.08)] text-sm"
                    >
                      {emoji}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            {group.map((entry) => (
              <div key={entry.id} className="mb-2 last:mb-0">
                <MealCard
                  mealType={entry.mealType}
                  description={`${Math.round(entry.totalCarbs ?? 0)}g carbs · ${Math.round(entry.totalFat ?? 0)}g fat`}
                  calories={entry.totalCalories}
                  protein={entry.totalProtein}
                  time={new Date(entry.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  color={mealColorMap[entry.mealType] ?? "blue"}
                  items={(entry.items ?? [])
                    .slice(0, 4)
                    .map((it) => foodById.get(it.foodId))
                    .filter(Boolean)
                    .map((f) => ({ emoji: foodEmoji((f as FoodItemType).name) }))}
                  onEdit={() => editMealType(entry.id, entry.mealType)}
                  onDelete={() => deleteMeal(entry.id)}
                />
              </div>
            ))}
          </div>
        );
      })}
      {!uniqueEntries.length && <EmptyState title="No meals logged yet" subtitle="Tap + to log your first meal today." />}
      <Toast message={error} type="error" />
      <Toast message={infoMessage} type="info" />
      <Toast message={undoDeleteMessage} type="info" actionLabel="Undo" onAction={undoDeleteMeal} />

      <button
        onClick={openAddMealSheet}
        className="fixed bottom-20 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#BEFF47] text-[#06080A] shadow-[0_6px_28px_rgba(190,255,71,.28)] transition-transform hover:bg-[#CCFF5A] active:scale-95"
      >
        <Plus size={24} />
      </button>

      {showSheet && (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/70 backdrop-blur-[12px]" onClick={() => setShowSheet(false)}>
          <div
            className="mx-auto max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl border-t p-5 pb-9"
            style={{ background: "#1C1C2C", borderColor: "rgba(255,255,255,.08)", animation: "sheet-up .35s cubic-bezier(.2,.8,.2,1)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowSheet(false)}
                className="mx-auto h-1 w-10 rounded-full bg-[rgba(255,255,255,.12)]"
                aria-label="Close add meal"
                title="Close"
              />
              <button
                type="button"
                onClick={() => setShowSheet(false)}
                className="rounded-lg border border-[rgba(255,255,255,.12)] bg-[rgba(255,255,255,.05)] p-1.5 text-[var(--muted)] hover:text-[var(--white)]"
                aria-label="Close add meal"
              >
                <X size={14} />
              </button>
            </div>
            <div className="mb-4 flex items-center justify-center gap-2">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all duration-300 ${step >= s ? "w-8 bg-[#BEFF47]" : "w-4 bg-[rgba(255,255,255,.16)]"}`}
                />
              ))}
            </div>
            {step === 1 && (
              <div className={`step-panel ${stepDir > 0 ? "step-forward" : "step-backward"}`}>
                <h2 className="num mb-4 text-lg font-bold tracking-tight text-[var(--white)]">Meal type</h2>
                <div className="grid grid-cols-3 gap-2">
                  {MEAL_TYPES.map((t, idx) => (
                    <button
                      key={t}
                      onClick={() => {
                        setMealType(t);
                        setMealTypeTouched(true);
                        setStepDir(1);
                        setStep(2);
                      }}
                      className="card-entrance-fast staggered py-2.5 rounded-xl border border-[rgba(255,255,255,.1)] bg-[rgba(255,255,255,.04)] text-sm font-semibold text-[var(--white)] hover:bg-[rgba(190,255,71,.16)] hover:border-[rgba(190,255,71,.45)] active:scale-95 transition-all"
                      style={{ ["--stagger-index" as string]: idx, ["--stagger-base" as string]: "0ms" }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className={`step-panel ${stepDir > 0 ? "step-forward" : "step-backward"}`}>
                <h2 className="num mb-4 text-lg font-bold tracking-tight text-[var(--white)]">{mealType} - choose a template</h2>
                <div className="space-y-2 mb-4">
                  {filteredTemplates.map((t, idx) => (
                    <button
                      key={t.id}
                      onClick={() => loadTemplate(t)}
                      className="card-entrance-fast staggered w-full text-left px-4 py-3 rounded-xl border border-[rgba(255,255,255,.1)] bg-[rgba(255,255,255,.04)] hover:bg-[rgba(190,255,71,.14)] hover:border-[rgba(190,255,71,.45)] active:scale-95 transition-all"
                      style={{ ["--stagger-index" as string]: idx, ["--stagger-base" as string]: "40ms" }}
                    >
                      <p className="font-medium text-sm text-[var(--white)]">{t.name}</p>
                      <p className="text-xs text-[var(--muted)]">{t.items.length} items</p>
                    </button>
                  ))}
                  {filteredTemplates.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-[rgba(255,255,255,.14)] px-3 py-2 text-xs text-[var(--muted)]">
                      No templates for {mealType}. Create one after building this meal.
                    </p>
                  ) : null}
                </div>
                <button
                  onClick={() => {
                    setStepDir(1);
                    setStep(3);
                  }}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-[rgba(255,255,255,.14)] text-sm text-[var(--muted)] hover:border-[rgba(190,255,71,.45)] transition-colors"
                >
                  + Custom meal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStepDir(-1);
                    setStep(1);
                  }}
                  className="mt-2 w-full rounded-xl py-2 text-xs font-semibold text-[var(--muted)]"
                >
                  Back
                </button>
              </div>
            )}

            {step === 3 && (
              <div className={`step-panel ${stepDir > 0 ? "step-forward" : "step-backward"}`}>
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="num text-lg font-bold tracking-tight text-[var(--white)]">Log a meal</h2>
                  <span className="text-xs text-[var(--muted)]">{items.length} items</span>
                </div>
                <div className="mb-3 rounded-xl border border-[rgba(255,255,255,.1)] bg-[rgba(255,255,255,.04)] p-2.5">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Meal type</p>
                  <div className="flex flex-wrap gap-1.5">
                    {MEAL_TYPES.map((t) => (
                      <button
                        key={`quick-type-${t}`}
                        type="button"
                        onClick={() => {
                          setMealType(t);
                          setMealTypeTouched(true);
                        }}
                        className={`rounded-xl border px-2.5 py-1 text-[10px] font-semibold transition-all ${
                          mealType === t
                            ? "border-[rgba(190,255,71,.35)] bg-[rgba(190,255,71,.15)] text-[#B8E86A] shadow-[0_0_14px_rgba(190,255,71,.22)]"
                            : "border-[rgba(255,255,255,.1)] bg-[rgba(255,255,255,.04)] text-[var(--muted)]"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  {!mealTypeTouched ? (
                    <p className="mt-1 text-[10px] text-[var(--muted)]">Suggested by current time. You can change this anytime.</p>
                  ) : null}
                  {filteredTemplates.length > 0 ? (
                    <div className="mt-2">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Quick templates</p>
                      <div className="flex flex-wrap gap-1.5">
                        {filteredTemplates.slice(0, 4).map((t) => (
                          <button
                            key={`quick-template-${t.id}`}
                            type="button"
                            onClick={() => loadTemplate(t)}
                            className="rounded-xl border border-[rgba(190,255,71,.32)] bg-[rgba(190,255,71,.14)] px-2.5 py-1 text-[10px] font-semibold text-[#B8E86A]"
                          >
                            {t.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {suggestedTemplates.length > 0 ? (
                    <div className="mt-2">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Suggested for you</p>
                      <div className="flex flex-wrap gap-1.5">
                        {suggestedTemplates.map((t) => (
                          <button
                            key={`suggested-template-${t.id}`}
                            type="button"
                            onClick={() => loadTemplate(t)}
                            className="rounded-xl border border-[rgba(45,212,160,.35)] bg-[rgba(45,212,160,.13)] px-2.5 py-1 text-[10px] font-semibold text-[#6EECC4]"
                          >
                            {t.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="mb-2 rounded-xl border border-[rgba(255,255,255,.1)] bg-[rgba(255,255,255,.03)] p-2.5">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Recipe name (optional)</p>
                  <input
                    value={recipeName}
                    onChange={(e) => setRecipeName(e.target.value)}
                    placeholder="e.g. Paneer tikka bowl"
                    className="w-full rounded-xl border border-[rgba(255,255,255,.12)] bg-[rgba(255,255,255,.05)] px-3 py-2 text-sm text-[var(--white)] placeholder:text-[var(--hint)] focus:border-[rgba(190,255,71,.55)] focus:outline-none"
                  />
                  <p className="mt-1 text-[10px] text-[var(--muted)]">Use this to save the meal as a named template later.</p>
                </div>
                <div className="mb-2 rounded-xl border border-[rgba(255,255,255,.1)] bg-[rgba(255,255,255,.03)]">
                  <button
                    type="button"
                    onClick={() => toggleSection("ingredients")}
                    className="w-full flex items-center justify-between px-3 py-2 text-left text-[var(--white)]"
                  >
                    <span className="text-sm font-semibold text-[var(--white)]">Ingredients</span>
                    {openSections.ingredients ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {openSections.ingredients && (
                    <div className="border-t border-[rgba(255,255,255,.08)] p-2">
                      {quickAddFoods.length > 0 ? (
                        <div className="mb-2">
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Quick add</p>
                          <div className="flex flex-wrap gap-1.5">
                            {quickAddFoods.map((food) => (
                              <button
                                key={`quick-add-${food.id}`}
                                type="button"
                                onClick={() => addFood(food)}
                                className="rounded-xl border border-[rgba(190,255,71,.32)] bg-[rgba(190,255,71,.14)] px-2.5 py-1 text-[10px] font-semibold text-[#B8E86A]"
                              >
                                {food.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      <FoodPicker foods={catalogFoods} onSelect={addFood} onSelectMany={addFoods} selectedIds={items.map((x) => x.foodId)} />
                    </div>
                  )}
                </div>

                <div className="mb-2 rounded-xl border border-[rgba(255,255,255,.1)] bg-[rgba(255,255,255,.03)]">
                  <button
                    type="button"
                    onClick={() => toggleSection("selected")}
                    className="w-full flex items-center justify-between px-3 py-2 text-left text-[var(--white)]"
                  >
                    <span className="text-sm font-semibold text-[var(--white)]">Selected items ({items.length})</span>
                    {openSections.selected ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {openSections.selected && (
                    <div className="border-t border-[rgba(255,255,255,.08)] p-2">
                      <div className="space-y-2 mb-2">
                        {items.length === 0 ? (
                          <p className="rounded-xl bg-[rgba(255,255,255,.05)] px-3 py-2 text-xs text-[var(--muted)]">
                            No items selected yet. Open Ingredients and add foods.
                          </p>
                        ) : null}
                        {items.map((item, i) => {
                          const food = foodById.get(item.foodId);
                          if (!food) return null;
                          return (
                            <div
                              key={`${item.foodId}-${i}`}
                              className="card-entrance-fast staggered rounded-xl border border-[rgba(255,255,255,.08)] bg-[rgba(255,255,255,.04)] p-2.5"
                              style={{ ["--stagger-index" as string]: i, ["--stagger-base" as string]: "30ms" }}
                            >
                        <div className="mb-1.5 flex justify-between gap-2">
                          <span className="text-sm font-medium text-[var(--white)]">{food.name}</span>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              disabled={i === 0}
                              onClick={() => moveItem(i, -1)}
                              className="rounded-md border border-[rgba(255,255,255,.12)] px-1.5 py-1 text-[10px] font-semibold text-[var(--muted)] disabled:opacity-40"
                            >
                              Up
                            </button>
                            <button
                              type="button"
                              disabled={i === items.length - 1}
                              onClick={() => moveItem(i, 1)}
                              className="rounded-md border border-[rgba(255,255,255,.12)] px-1.5 py-1 text-[10px] font-semibold text-[var(--muted)] disabled:opacity-40"
                            >
                              Down
                            </button>
                            <button
                              type="button"
                              onClick={() => removeItem(i)}
                              className="rounded-md border border-[rgba(255,92,122,.35)] p-1 text-[#FF5C7A]"
                              aria-label={`Remove ${food.name}`}
                            >
                              <X size={12} />
                            </button>
                          </div>
                          <div className="flex shrink-0 gap-0 rounded-xl bg-[rgba(255,255,255,.06)] p-1 text-xs">
                            <button
                              onClick={() => updateItem(i, { inputMode: "multiplier", grams: undefined })}
                              className={`rounded-[10px] px-2 py-1 font-semibold transition-all ${
                                item.inputMode === "multiplier"
                                  ? "bg-[rgba(255,255,255,.14)] text-[var(--white)] shadow-sm"
                                  : "font-medium text-[var(--muted)] hover:text-[var(--white)]"
                              }`}
                            >
                              Serving
                            </button>
                            <button
                              onClick={() => updateItem(i, { inputMode: "grams", multiplier: undefined })}
                              className={`rounded-[10px] px-2 py-1 font-semibold transition-all ${
                                item.inputMode === "grams"
                                  ? "bg-[rgba(255,255,255,.14)] text-[var(--white)] shadow-sm"
                                  : "font-medium text-[var(--muted)] hover:text-[var(--white)]"
                              }`}
                            >
                              Grams
                            </button>
                          </div>
                        </div>
                        {item.inputMode === "multiplier" ? (
                          <div className="flex gap-2">
                            {[0.5, 1, 1.5, 2].map((m) => (
                              <button
                                key={m}
                                onClick={() => updateItem(i, { multiplier: m })}
                              className={`flex-1 rounded-[10px] py-1 text-xs font-semibold transition-colors ${item.multiplier === m ? "bg-[#BEFF47] text-[#06080A]" : "border border-[rgba(255,255,255,.12)] bg-[rgba(255,255,255,.04)] text-[var(--muted)] hover:border-[rgba(190,255,71,.45)] hover:text-[var(--white)]"}`}
                              >
                                {m}×
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <input
                              type="number"
                              inputMode="decimal"
                              step="0.1"
                              placeholder="grams / ml"
                              value={item.grams ?? ""}
                              onChange={(e) => updateItem(i, { grams: parseFloat(e.target.value) || undefined })}
                              className="w-full rounded-xl border border-[rgba(255,255,255,.12)] bg-[rgba(255,255,255,.05)] px-3 py-2 text-sm text-[var(--white)] transition-all placeholder:text-[var(--hint)] focus:border-[rgba(190,255,71,.55)] focus:bg-[rgba(255,255,255,.09)] focus:outline-none focus:ring-2 focus:ring-[rgba(190,255,71,.22)]"
                            />
                            <div className="flex gap-1.5">
                              {[20, 50, 100, 200].map((g) => (
                                <button
                                  key={g}
                                  type="button"
                                  onClick={() => updateItem(i, { grams: g })}
                                  className="rounded-lg border border-[rgba(255,255,255,.12)] bg-[rgba(255,255,255,.04)] px-2 py-1 text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--white)]"
                                >
                                  {g}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        <p className="mt-1.5 text-[10px] text-[var(--muted)]">
                          Base: {food.baseQuantity} ({food.baseWeightGrams}g/ml)
                        </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mb-3 rounded-xl border border-[rgba(255,255,255,.1)] bg-[rgba(255,255,255,.04)] p-2.5">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Meal overview</p>
                    <span className="num text-sm font-bold text-[var(--white)]">{Math.round(draftCal)} kcal</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <div className="rounded-lg border border-[rgba(45,212,160,.28)] bg-[rgba(45,212,160,.12)] px-2 py-1 text-center">
                      <p className="num text-xs font-bold text-[#6EECC4]">{Math.round(draftProt)}g</p>
                      <p className="text-[9px] uppercase tracking-wide text-[rgba(110,236,196,.75)]">Protein</p>
                    </div>
                    <div className="rounded-lg border border-[rgba(255,181,71,.28)] bg-[rgba(255,181,71,.12)] px-2 py-1 text-center">
                      <p className="num text-xs font-bold text-[#FFCF80]">{Math.round(draftCarbs)}g</p>
                      <p className="text-[9px] uppercase tracking-wide text-[rgba(255,207,128,.75)]">Carbs</p>
                    </div>
                    <div className="rounded-lg border border-[rgba(255,92,122,.28)] bg-[rgba(255,92,122,.12)] px-2 py-1 text-center">
                      <p className="num text-xs font-bold text-[#FF8FA5]">{Math.round(draftFat)}g</p>
                      <p className="text-[9px] uppercase tracking-wide text-[rgba(255,143,165,.75)]">Fat</p>
                    </div>
                  </div>
                </div>

                <div className="mb-2 grid grid-cols-2 gap-2">
                  <button
                    disabled={isSaving || !items.length}
                    onClick={logMeal}
                    className="rounded-xl bg-[#BEFF47] py-3 text-sm font-semibold text-[#06080A] transition-transform hover:bg-[#CCFF5A] active:scale-95 disabled:opacity-40"
                  >
                    {isSaving ? "Saving..." : "Log Meal"}
                  </button>
                  {!showTemplateSave ? (
                    <button
                      type="button"
                      disabled={!items.length}
                      onClick={() => {
                        setTemplateName(recipeName.trim() || `${mealType} custom`);
                        setShowTemplateSave(true);
                      }}
                      className="rounded-xl border border-white/12 bg-white/[0.04] py-3 text-sm font-semibold text-[#B8E86A] transition-transform hover:bg-white/[0.07] active:scale-95 disabled:opacity-40"
                    >
                      Save recipe template
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setShowTemplateSave(false);
                        setTemplateName("");
                      }}
                      className="rounded-xl border border-[rgba(255,255,255,.12)] bg-[rgba(255,255,255,.05)] py-3 text-sm font-semibold text-[var(--muted)]"
                    >
                      Cancel template
                    </button>
                  )}
                </div>
                {showTemplateSave ? (
                  <div className="mt-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 backdrop-blur-sm">
                    <p className="mb-2 text-xs font-semibold text-[#B8E86A]">Template name</p>
                    <input
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="e.g. Oats + Milk bowl"
                      className="w-full rounded-xl border border-white/12 bg-white/[0.05] px-3 py-2 text-sm text-[var(--white)] placeholder:text-[var(--hint)] focus:border-[#BEFF47]/40 focus:outline-none focus:ring-1 focus:ring-[#BEFF47]/20"
                    />
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowTemplateSave(false);
                          setTemplateName("");
                        }}
                        className="rounded-xl border border-white/12 bg-white/[0.04] py-2 text-sm font-semibold text-[var(--muted)] transition-colors hover:bg-white/[0.07] hover:text-[var(--white)]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={!templateName.trim()}
                        onClick={() => void saveCurrentAsTemplate(templateName)}
                        className="rounded-xl bg-[#BEFF47] py-2 text-sm font-semibold text-[#06080A] transition-transform hover:bg-[#CCFF5A] disabled:opacity-40"
                      >
                        Save template
                      </button>
                    </div>
                  </div>
                ) : null}
                <Toast message={error} type="error" />
                <button
                  type="button"
                  onClick={() => {
                    setStepDir(-1);
                    setStep(2);
                  }}
                  className="mt-2 w-full rounded-xl py-2 text-xs font-semibold text-[var(--muted)]"
                >
                  Browse all templates
                </button>
                <button
                  type="button"
                  onClick={() => setShowKeyboardHelp((prev) => !prev)}
                  className="mt-1 w-full rounded-xl py-2 text-xs font-semibold text-[var(--muted)]"
                >
                  Keyboard shortcuts
                </button>
                {showKeyboardHelp ? (
                  <div className="mt-1 rounded-xl border border-[rgba(255,255,255,.1)] bg-[rgba(255,255,255,.03)] px-3 py-2 text-[10px] text-[var(--muted)]">
                    <p>`Ctrl/Cmd + S` log meal</p>
                    <p>`Ctrl/Cmd + K` quick add first suggestion</p>
                    <p>`?` toggle this help</p>
                  </div>
                ) : null}
                {items.length > 0 || recipeName.trim() ? (
                  <button
                    type="button"
                    onClick={() => {
                      setItems([]);
                      setRecipeName("");
                      if (typeof window !== "undefined") window.localStorage.removeItem(DRAFT_KEY);
                      setInfoMessage("Draft cleared.");
                    }}
                    className="mt-1 w-full rounded-xl py-2 text-xs font-semibold text-[var(--muted)]"
                  >
                    Clear draft
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}

      {barcodeDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm" onClick={() => setBarcodeDialogOpen(false)}>
          <div
            className="w-full max-w-sm rounded-2xl border border-[rgba(255,255,255,.1)] bg-[#1C1C2C] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="num text-lg font-bold text-[var(--white)]">Barcode lookup</p>
              <button type="button" onClick={() => setBarcodeDialogOpen(false)} className="rounded-md border border-[rgba(255,255,255,.12)] p-1 text-[var(--muted)]">
                <X size={13} />
              </button>
            </div>
            <p className="mb-2 text-xs text-[var(--muted)]">Lookup first, then choose if you want to store product details in DB.</p>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={barcodeInput}
                onChange={(e) => {
                  setBarcodeInput(e.target.value);
                  setBarcodeErr("");
                  setBarcodeLookup(null);
                }}
                placeholder="EAN / UPC"
                className="flex-1 rounded-xl border border-[rgba(45,212,160,.35)] bg-[rgba(0,0,0,.14)] px-3 py-2 text-sm text-[var(--white)] placeholder:text-[var(--hint)]"
              />
              <button
                type="button"
                disabled={barcodeBusy || !barcodeInput.trim()}
                onClick={() => void importFromBarcode(barcodeInput)}
                className="rounded-xl bg-[linear-gradient(135deg,#16a34a,#10b981)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {barcodeBusy ? "..." : "Look up"}
              </button>
            </div>
            {canScan ? (
              <button
                type="button"
                onClick={() => setScanOpen(true)}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-[rgba(45,212,160,.4)] bg-[rgba(45,212,160,.12)] py-2 text-xs font-semibold text-emerald-100"
              >
                <ScanLine size={14} />
                Scan with camera
              </button>
            ) : null}
            {barcodeErr ? <p className="mt-2 text-xs text-[#FF5C7A]">{barcodeErr}</p> : null}
            {barcodeLookup ? (
              <div className="mt-3 rounded-xl border border-[rgba(255,255,255,.1)] bg-[rgba(255,255,255,.04)] p-3">
                {"food" in barcodeLookup ? (
                  <>
                    <p className="text-sm font-semibold text-[var(--white)]">{barcodeLookup.food.name}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">Already in DB. Added to your meal draft.</p>
                    <button
                      type="button"
                      onClick={() => {
                        const food = barcodeLookup.food;
                        setImportedFoods((prev) => (prev.some((x) => x.id === food.id) ? prev : [...prev, food]));
                        setItems((prev) => (prev.some((x) => x.foodId === food.id) ? prev : [...prev, { foodId: food.id, multiplier: 1, inputMode: "multiplier" }]));
                        setShowSheet(true);
                        setStep(3);
                        setBarcodeDialogOpen(false);
                      }}
                      className="mt-2 w-full rounded-xl border border-[rgba(190,255,71,.35)] bg-[rgba(190,255,71,.12)] py-2 text-xs font-semibold text-[#B8E86A]"
                    >
                      Add to meal draft
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-[var(--white)]">{barcodeLookup.product.name}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {Math.round(barcodeLookup.product.calories)} kcal · P {Math.round(barcodeLookup.product.protein)} · C {Math.round(barcodeLookup.product.carbs)} · F{" "}
                      {Math.round(barcodeLookup.product.fat)} (per 100g)
                    </p>
                    <button
                      type="button"
                      disabled={barcodeBusy}
                      onClick={() => void saveLookedUpBarcode()}
                      className="mt-2 w-full rounded-xl bg-[#10b981] py-2 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      Save product to DB
                    </button>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      <BarcodeScanModal open={scanOpen} onClose={() => setScanOpen(false)} onCode={(code) => void importFromBarcode(code)} />
      {showCelebration && (
        <FirstLogCelebration onClose={() => setShowCelebration(false)} calories={totalCalories} protein={totalProtein} />
      )}
    </div>
  );
}
