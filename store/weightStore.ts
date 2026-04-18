"use client";

import { create } from "zustand";
import { WeightLogType } from "@/types";

interface WeightStore {
  logs: WeightLogType[];
  range: "7d" | "30d";
  fetchLogs: (range?: "7d" | "30d") => Promise<void>;
  addLog: (weight: number) => Promise<void>;
  setRange: (range: "7d" | "30d") => void;
}

export const useWeightStore = create<WeightStore>((set, get) => ({
  logs: [],
  range: "7d",
  setRange: (range) => {
    set({ range });
    get().fetchLogs(range);
  },
  fetchLogs: async (range) => {
    const r = range ?? get().range;
    const res = await fetch(`/api/weight?range=${r}`, { credentials: "include" });
    const data = await res.json();
    set({ logs: data });
  },
  addLog: async (weight) => {
    const date = new Date().toISOString().split("T")[0];
    await fetch("/api/weight", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, weight }),
    });
    await get().fetchLogs();
  },
}));
