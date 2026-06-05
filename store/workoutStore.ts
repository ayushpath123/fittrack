"use client";

import { create } from "zustand";
import type { WorkoutDaySummary, WorkoutLogType } from "@/types/workout";

export const WORKOUT_SYNC_EVENT = "fittrack-workout-updated";

type WorkoutStore = {
  todayLogs: WorkoutLogType[];
  todaySummary: WorkoutDaySummary;
  weekSummary: WorkoutDaySummary;
  initialized: boolean;
  initFromServer: (logs: WorkoutLogType[], today: WorkoutDaySummary, week: WorkoutDaySummary) => void;
  setTodayLogs: (logs: WorkoutLogType[]) => void;
  addLog: (log: WorkoutLogType) => void;
  updateLog: (log: WorkoutLogType) => void;
  removeLog: (id: string) => void;
  recomputeSummaries: () => void;
  fetchToday: (date?: string) => Promise<void>;
};

function emptySummary(): WorkoutDaySummary {
  return { workoutCount: 0, totalCaloriesBurned: 0, totalDurationMin: 0 };
}

function summarize(logs: { duration: number; caloriesBurned: number }[]): WorkoutDaySummary {
  return {
    workoutCount: logs.length,
    totalCaloriesBurned: logs.reduce((s, l) => s + l.caloriesBurned, 0),
    totalDurationMin: logs.reduce((s, l) => s + l.duration, 0),
  };
}

function notifySync() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(WORKOUT_SYNC_EVENT));
  }
}

export const useWorkoutStore = create<WorkoutStore>((set, get) => ({
  todayLogs: [],
  todaySummary: emptySummary(),
  weekSummary: emptySummary(),
  initialized: false,

  initFromServer(logs, today, week) {
    set({ todayLogs: logs, todaySummary: today, weekSummary: week, initialized: true });
  },

  setTodayLogs(logs) {
    set({ todayLogs: logs, todaySummary: summarize(logs) });
    notifySync();
  },

  addLog(log) {
    const logs = [log, ...get().todayLogs];
    set({ todayLogs: logs, todaySummary: summarize(logs) });
    notifySync();
  },

  updateLog(log) {
    const logs = get().todayLogs.map((l) => (l.id === log.id ? log : l));
    set({ todayLogs: logs, todaySummary: summarize(logs) });
    notifySync();
  },

  removeLog(id) {
    const logs = get().todayLogs.filter((l) => l.id !== id);
    set({ todayLogs: logs, todaySummary: summarize(logs) });
    notifySync();
  },

  recomputeSummaries() {
    const logs = get().todayLogs;
    set({ todaySummary: summarize(logs) });
    notifySync();
  },

  async fetchToday(date?: string) {
    const dateKey = date ?? new Date().toISOString().split("T")[0];
    const [logsRes, summaryRes] = await Promise.all([
      fetch(`/api/workout?date=${dateKey}`, { credentials: "include" }),
      fetch(`/api/workout/summary?date=${dateKey}`, { credentials: "include" }),
    ]);
    if (!logsRes.ok || !summaryRes.ok) return;
    const logs = (await logsRes.json()) as WorkoutLogType[];
    const summary = (await summaryRes.json()) as { today: WorkoutDaySummary; week: WorkoutDaySummary };
    set({
      todayLogs: logs,
      todaySummary: summary.today,
      weekSummary: summary.week,
      initialized: true,
    });
    notifySync();
  },
}));
