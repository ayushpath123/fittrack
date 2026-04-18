import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Dumbbell } from "lucide-react";
import { requireUserId } from "@/lib/auth";
import { toLocalDateKey } from "@/lib/date";

export default async function CalendarPage() {
  const userId = await requireUserId();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59);

  const [meals, workouts, weights, goals] = await Promise.all([
    prisma.mealEntry.findMany({ where: { userId, date: { gte: start, lte: end } } }),
    prisma.workout.findMany({ where: { userId, date: { gte: start, lte: end } } }),
    prisma.weightLog.findMany({ where: { userId, date: { gte: start, lte: end } } }),
    prisma.goalSetting.findUnique({ where: { userId } }),
  ]);
  const calorieTarget = goals?.calorieTarget ?? 1500;

  const daysInMonth = end.getDate();
  const firstDow = start.getDay();
  const todayStr = toLocalDateKey(now);
  const mealTotalsByDate = new Map<string, number>();
  const workoutDates = new Set<string>();
  const weightDates = new Set<string>();

  for (const meal of meals) {
    const key = toLocalDateKey(new Date(meal.date));
    mealTotalsByDate.set(key, (mealTotalsByDate.get(key) ?? 0) + meal.totalCalories);
  }
  for (const workout of workouts) {
    workoutDates.add(toLocalDateKey(new Date(workout.date)));
  }
  for (const weight of weights) {
    weightDates.add(toLocalDateKey(new Date(weight.date)));
  }

  function dateStr(d: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  function dayData(d: number) {
    const ds = dateStr(d);
    const totalCal = mealTotalsByDate.get(ds) ?? 0;
    const hasFood = mealTotalsByDate.has(ds);
    const hasWorkout = workoutDates.has(ds);
    const hasWeight = weightDates.has(ds);
    return { hasWorkout, hasWeight, totalCal, hasFood, underTarget: hasFood && totalCal <= calorieTarget };
  }

  return (
    <div>
      <Link
        href="/analytics"
        className="mb-2 inline-flex items-center rounded-xl border border-[rgba(190,255,71,.32)] bg-[rgba(190,255,71,.12)] px-3 py-1.5 text-xs font-semibold text-[#B8E86A]"
      >
        Back to Stats
      </Link>
      <h1 className="num text-2xl font-bold tracking-tight text-[var(--white)] mb-1">
        {now.toLocaleDateString("en", { month: "long", year: "numeric" })}
      </h1>
      <p className="text-[11px] text-[var(--muted)] mb-4">Calorie colors use your daily target ({calorieTarget} kcal).</p>

      <div className="grid grid-cols-7 mb-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <p key={i} className="text-center text-xs text-[var(--muted)] pb-1">
            {d}
          </p>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDow }).map((_, i) => (
          <div key={`e-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const { hasWorkout, hasWeight, hasFood, underTarget } = dayData(day);
          const ds = dateStr(day);
          const isToday = ds === todayStr;
          let bg = "text-[rgba(244,244,255,.3)]";
          let bgStyle: React.CSSProperties = { background: "rgba(255,255,255,.04)", borderColor: "rgba(255,255,255,.06)" };
          if (hasFood)
            if (underTarget) {
              bg = "text-[#2DD4A0]";
              bgStyle = { background: "rgba(45,212,160,.12)", borderColor: "rgba(45,212,160,.22)" };
            } else {
              bg = "text-[#FF5C7A]";
              bgStyle = { background: "rgba(255,92,122,.12)", borderColor: "rgba(255,92,122,.22)" };
            }

          return (
            <Link
              key={day}
              href={`/calendar/${ds}`}
              className={`aspect-square border ${bg} flex flex-col items-center justify-center gap-0.5 rounded-xl ${
                isToday ? "ring-2 ring-[#BEFF47]" : ""
              } active:scale-95 transition-transform`}
              style={isToday ? { ...bgStyle, boxShadow: "0 0 0 2px #BEFF47, 0 0 12px rgba(190,255,71,.4)" } : bgStyle}
            >
              <span className="text-xs font-semibold">{day}</span>
              <div className="flex gap-0.5 mt-0.5">
                {hasWorkout && <Dumbbell size={8} className="text-[var(--muted)]" />}
                {hasWeight && <span className="w-1 h-1 bg-[#BEFF47] rounded-full" />}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 text-xs text-[var(--muted)] justify-center">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ background: "rgba(45,212,160,.12)" }} /> ≤ target
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ background: "rgba(255,92,122,.12)" }} /> Over target
        </span>
        <span className="flex items-center gap-1">
          <Dumbbell size={10} /> Workout
        </span>
      </div>
    </div>
  );
}
