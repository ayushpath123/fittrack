"use client";

import { WORKOUT_TYPES, type WorkoutTypeKind } from "@/types/workout";

type WorkoutTypeSelectProps = {
  value: WorkoutTypeKind | "";
  onChange: (value: WorkoutTypeKind) => void;
  error?: string;
};

export function WorkoutTypeSelect({ value, onChange, error }: WorkoutTypeSelectProps) {
  return (
    <div className="w-full space-y-1.5">
      <label className="block text-sm font-medium text-[var(--muted)]">Workout Type</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as WorkoutTypeKind)}
        className="w-full rounded-xl border border-white/12 bg-white/[0.06] px-4 py-3 text-sm text-white transition-all focus:border-[#BEFF47]/35 focus:outline-none focus:ring-2 focus:ring-[#BEFF47]/20"
      >
        <option value="" disabled className="bg-[#1C1C2C]">
          Select type
        </option>
        {WORKOUT_TYPES.map((t) => (
          <option key={t.value} value={t.value} className="bg-[#1C1C2C]">
            {t.label}
          </option>
        ))}
      </select>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
