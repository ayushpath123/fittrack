"use client";

import { create } from "zustand";
import { ExerciseEntryType, WorkoutType } from "@/types";

interface WorkoutStore {
  todayWorkout: WorkoutType | null;
  draftExercises: ExerciseEntryType[];
  addExercise: (ex: ExerciseEntryType) => void;
  removeExercise: (index: number) => void;
  saveWorkout: () => Promise<WorkoutType>;
  markComplete: (workoutId: string) => Promise<void>;
  fetchTodayWorkout: () => Promise<void>;
}

export const useWorkoutStore = create<WorkoutStore>((set, get) => ({
  todayWorkout: null,
  draftExercises: [],
  addExercise: (ex) => set((s) => ({ draftExercises: [...s.draftExercises, ex] })),
  removeExercise: (index) => set((s) => ({ draftExercises: s.draftExercises.filter((_, i) => i !== index) })),
  fetchTodayWorkout: async () => {
    const date = new Date().toISOString().split("T")[0];
    const res = await fetch(`/api/workout?date=${date}`, { credentials: "include" });
    const data = await res.json();
    set({ todayWorkout: data ?? null });
  },
  saveWorkout: async () => {
    const date = new Date().toISOString().split("T")[0];
    const res = await fetch("/api/workout", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, exercises: get().draftExercises }),
    });
    const saved = await res.json();
    set({ todayWorkout: saved, draftExercises: [] });
    return saved;
  },
  markComplete: async (workoutId) => {
    await fetch(`/api/workout/${workoutId}`, { method: "PATCH", credentials: "include" });
    set((s) => (s.todayWorkout ? { todayWorkout: { ...s.todayWorkout, completed: true } } : {}));
  },
}));
