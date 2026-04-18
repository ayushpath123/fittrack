"use client";

import { create } from "zustand";
import { FoodItemType, MealEntryType, MealTemplateType } from "@/types";

interface MealStore {
  foods: FoodItemType[];
  templates: MealTemplateType[];
  todayEntries: MealEntryType[];
  isLoading: boolean;
  showCelebration: boolean;
  fetchFoods: () => Promise<void>;
  fetchTodayEntries: () => Promise<void>;
  addMealEntry: (entry: Omit<MealEntryType, "id">) => Promise<void>;
  clearCelebration: () => void;
}

export const useMealStore = create<MealStore>((set) => ({
  foods: [],
  templates: [],
  todayEntries: [],
  isLoading: false,
  showCelebration: false,
  fetchFoods: async () => {
    const res = await fetch("/api/food", { credentials: "include" });
    const data = await res.json();
    set({ foods: data.foods, templates: data.templates });
  },
  fetchTodayEntries: async () => {
    const date = new Date().toISOString().split("T")[0];
    const res = await fetch(`/api/meals?date=${date}`, { credentials: "include" });
    const data = await res.json();
    set({ todayEntries: data });
  },
  addMealEntry: async (entry) => {
    const isFirst = useMealStore.getState().todayEntries.length === 0;
    const tempId = `temp-${Date.now()}`;
    set((state) => ({ todayEntries: [...state.todayEntries, { ...entry, id: tempId }] }));
    try {
      const res = await fetch("/api/meals", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
      const saved = await res.json();
      set((state) => ({
        todayEntries: state.todayEntries.map((e) => (e.id === tempId ? saved : e)),
        showCelebration: isFirst,
      }));
    } catch {
      set((state) => ({ todayEntries: state.todayEntries.filter((e) => e.id !== tempId) }));
    }
  },
  clearCelebration: () => set({ showCelebration: false }),
}));
