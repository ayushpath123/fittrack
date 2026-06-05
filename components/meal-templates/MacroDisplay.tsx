import type { MacroSnapshot } from "@/lib/meal-templates";

type MacroDisplayProps = {
  macros: MacroSnapshot;
  size?: "sm" | "md";
  highlightCalories?: boolean;
};

export function MacroDisplay({ macros, size = "md", highlightCalories = true }: MacroDisplayProps) {
  const calorieClass = size === "sm" ? "text-base font-bold" : "text-lg font-bold";
  const macroClass = size === "sm" ? "text-[10px]" : "text-[11px]";

  return (
    <div>
      {highlightCalories ? (
        <p className={calorieClass + " text-[#BEFF47]"}>{Math.round(macros.calories)} kcal</p>
      ) : null}
      <p className={macroClass + " text-[var(--muted)]"}>
        P: {macros.protein}g · C: {macros.carbs}g · F: {macros.fat}g
      </p>
    </div>
  );
}
